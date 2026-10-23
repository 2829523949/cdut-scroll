"""Deploy the built service using the official Cloudflare API and local Wrangler login.
Never prints authentication tokens or the generated administrator password.
"""
import json
import http.client
import os
from pathlib import Path
import secrets
import time
import tomllib
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
PRIVATE = REPO.parent / 'cdut-results-private'
NAME = 'cdut-survey-results'
API = 'https://api.cloudflare.com/client/v4'

def auth_token():
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    if token:
        return token
    candidates = [Path(os.environ.get('APPDATA', Path.home())) / 'xdg.config/.wrangler/config/default.toml', Path.home() / '.wrangler/config/default.toml', Path.home() / '.config/.wrangler/config/default.toml']
    for path in candidates:
        if path.exists():
            token = tomllib.loads(path.read_text('utf-8')).get('oauth_token')
            if token:
                return token
    raise RuntimeError('Please complete Wrangler login first.')

def main():
    token = auth_token()
    def api(method, path, data=None, raw=None, content_type=None):
        headers = {'Authorization': 'Bearer ' + token, 'User-Agent': 'cdut-results-deployer'}
        if data is not None:
            raw = json.dumps(data).encode()
            content_type = 'application/json'
        if content_type:
            headers['Content-Type'] = content_type
        request = urllib.request.Request(API + path, data=raw, headers=headers, method=method)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    result = json.load(response)
                break
            except urllib.error.HTTPError as error:
                raise RuntimeError(f'Cloudflare API {method} {path}: HTTP {error.code}') from None
            except (urllib.error.URLError, http.client.RemoteDisconnected, TimeoutError, ConnectionError):
                if attempt == 2 or (method == 'POST' and not path.endswith(('/query', '/subdomain'))):
                    raise RuntimeError('Cloudflare connection interrupted. Re-run the deployment to continue safely.') from None
                print('Retrying interrupted Cloudflare request...', flush=True)
                time.sleep(2)
        if not result.get('success'):
            codes = [str(error.get('code')) for error in result.get('errors', [])]
            raise RuntimeError('Cloudflare API returned error codes: ' + ','.join(codes))
        return result['result']

    bundle = ROOT / 'dist/worker.mjs'
    if not bundle.exists():
        raise RuntimeError('Run node build.mjs first.')
    PRIVATE.mkdir(exist_ok=True)
    private_file = PRIVATE / 'admin-access.json'
    saved = json.loads(private_file.read_text('utf-8')) if private_file.exists() else {}
    account_id = saved.get('accountId')
    accounts = api('GET', '/accounts?per_page=50')
    if not account_id:
        if len(accounts) == 1:
            account_id = accounts[0]['id']
        else:
            for account in accounts:
                subdomain = api('GET', f"/accounts/{account['id']}/workers/subdomain")
                if subdomain.get('subdomain') == 'ucas-zzz256':
                    account_id = account['id']
                    break
    if not account_id:
        raise RuntimeError('Multiple accounts found. Choose the intended account before deploying.')
    base = f'/accounts/{account_id}'
    subdomain = api('GET', base + '/workers/subdomain')['subdomain']
    databases = api('GET', base + '/d1/database?name=' + NAME)
    database = next((database for database in databases if database['name'] == NAME), None)
    if not database:
        database = api('POST', base + '/d1/database', {'name': NAME})
    database_id = database['uuid']
    print('Result database ready.', flush=True)
    api('POST', base + f'/d1/database/{database_id}/query', {'sql': (ROOT / 'schema.sql').read_text('utf-8')})
    password = saved.get('password') or secrets.token_urlsafe(24)
    rate_secret = saved.get('rateSecret') or secrets.token_hex(32)
    api_base = f'https://{NAME}.{subdomain}.workers.dev'
    settings = {'accountId': account_id, 'databaseId': database_id, 'apiBase': api_base, 'adminUrl': api_base + '/admin', 'password': password, 'rateSecret': rate_secret}
    private_file.write_text(json.dumps(settings, ensure_ascii=False, indent=2), 'utf-8')
    metadata = {'main_module': 'worker.mjs', 'compatibility_date': '2026-10-23', 'bindings': [
        {'type': 'd1', 'name': 'DB', 'id': database_id},
        {'type': 'plain_text', 'name': 'ALLOWED_ORIGINS', 'text': 'https://2829523949.github.io'},
        {'type': 'secret_text', 'name': 'ADMIN_PASSWORD', 'text': password},
        {'type': 'secret_text', 'name': 'RATE_SECRET', 'text': rate_secret}
    ], 'observability': {'enabled': False}}
    boundary = 'cdut-' + secrets.token_hex(16)
    body = b''
    for name, filename, content_type, content in [('metadata', None, 'application/json', json.dumps(metadata).encode()), ('worker.mjs', 'worker.mjs', 'application/javascript+module', bundle.read_bytes())]:
        disposition = 'form-data; name="' + name + '"' + (f'; filename="{filename}"' if filename else '')
        body += f'--{boundary}\r\nContent-Disposition: {disposition}\r\nContent-Type: {content_type}\r\n\r\n'.encode() + content + b'\r\n'
    body += f'--{boundary}--\r\n'.encode()
    api('PUT', base + '/workers/scripts/' + NAME, raw=body, content_type='multipart/form-data; boundary=' + boundary)
    api('POST', base + '/workers/scripts/' + NAME + '/subdomain', {'enabled': True, 'previews_enabled': False})
    api('PUT', base + '/workers/scripts/' + NAME + '/schedules', [{'cron': '17 19 * * *'}])
    print('Management service deployed. Checking availability...', flush=True)
    for attempt in range(8):
        try:
            with urllib.request.urlopen(urllib.request.Request(api_base + '/api/health', headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as response:
                health = json.load(response)
            if health.get('ready'):
                break
        except (urllib.error.URLError, TimeoutError):
            if attempt == 7:
                raise RuntimeError('Service deployed; its health check is not reachable yet. Frontend collection remains disabled.') from None
            time.sleep(5)
    else:
        raise RuntimeError('Health check did not become ready.')
    (REPO / 'collection-config.js').write_text('export const collection = Object.freeze(' + json.dumps({'enabled': True, 'apiBase': api_base}) + ');\n', 'utf-8')
    print('Health check passed. Frontend configuration enabled.', flush=True)
    print('Admin URL: ' + api_base + '/admin', flush=True)
    print('Administrator credentials saved locally: ' + json.dumps(str(private_file)), flush=True)

if __name__ == '__main__':
    main()
