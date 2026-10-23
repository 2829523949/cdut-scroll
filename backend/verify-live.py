"""Run a synthetic live save/read/export check, then remove only that test row."""
import http.cookiejar
import json
import secrets
import urllib.error
import urllib.request
import uuid
from deploy import PRIVATE, API, auth_token

config = json.loads((PRIVATE / 'admin-access.json').read_text('utf-8'))
base = config['apiBase']
identifier = str(uuid.uuid4())
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path, data=None, logged_in=True):
    headers = {'User-Agent': 'Mozilla/5.0'}
    if data is not None:
        headers.update({'Content-Type': 'application/json', 'Origin': 'https://2829523949.github.io' if path == '/api/responses' else base})
    req = urllib.request.Request(base + path, data=json.dumps(data).encode() if data is not None else None, headers=headers)
    client = opener if logged_in else urllib.request.build_opener()
    return client.open(req, timeout=30)
def data(path, body=None):
    with request(path, body) as response:
        return json.load(response)

created = False
try:
    try:
        with request('/api/admin/responses', logged_in=False):
            raise AssertionError('Unauthenticated access was permitted')
    except urllib.error.HTTPError as error:
        assert error.code == 401
    assert data('/api/admin/login', {'password': config['password']})['loggedIn']
    assert data('/api/admin/session')['loggedIn']
    answers = [0, 0, 0, 0, 0, [0, 1], 0, [1, 3], [0, 1, 5], 0, 4, 3, 0, 0, 0, [0, 3]]
    payload = {'id': identifier, 'editToken': secrets.token_hex(32), 'revision': 1, 'answers': answers, 'consent': True, 'privacyVersion': '2026-10-23-v1', 'version': 'wjx-20261023'}
    assert data('/api/responses', payload)['saved']
    created = True
    assert data('/api/responses', payload)['saved']
    records = data('/api/admin/responses')['rows']
    found = [row for row in records if row['id'] == identifier]
    assert len(found) == 1 and found[0]['answers'] == answers
    assert len(found[0]['dimensions']) == 4
    stats = data('/api/admin/stats')
    assert stats['summary']['total'] >= 1 and len(stats['questions']) == 16
    with request('/api/admin/export') as response:
        csv = response.read()
        assert csv.startswith(b'\xef\xbb\xbf') and identifier.encode() in csv
    print('PASS: private login, anonymous save, deduplication, answer detail, question statistics and CSV export.', flush=True)
finally:
    if created:
        req = urllib.request.Request(API + f"/accounts/{config['accountId']}/d1/database/{config['databaseId']}/query", data=json.dumps({'sql': 'DELETE FROM responses WHERE id=?', 'params': [identifier]}).encode(), headers={'Authorization': 'Bearer ' + auth_token(), 'Content-Type': 'application/json', 'User-Agent': 'cdut-live-check'}, method='POST')
        with urllib.request.urlopen(req, timeout=30) as response:
            assert json.load(response)['success']
        print('Synthetic test answer removed.', flush=True)
    if jar:
        data('/api/admin/logout', {})
