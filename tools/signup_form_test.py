import json, pathlib, sys
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path('/workspace/campushealthcoach')
SITE = 'https://campushealthcoach.com'
results = []
def check(name, cond, extra=''):
    results.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name, extra)

def run(page_setup, fs_mode, eng_mode):
    engine_calls = []; fs_calls = []
    def site(route):
        path = route.request.url.split(SITE, 1)[1].split('?')[0].split('#')[0] or '/'
        f = ROOT / ('index.html' if path == '/' else path.lstrip('/'))
        if not f.exists(): return route.fulfill(status=404, body='nf')
        ct = {'.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css'}.get(f.suffix, 'application/octet-stream')
        route.fulfill(status=200, body=f.read_bytes(), headers={'content-type': ct})
    def fs(route):
        fs_calls.append(route.request.post_data)
        if fs_mode == '521': return route.fulfill(status=521, body='error code: 521', headers={'content-type': 'text/plain'})
        if route.request.method == 'OPTIONS':
            return route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,accept', 'access-control-allow-methods': 'POST'})
        route.fulfill(status=200, body=json.dumps({'success': 'true'}), headers={'content-type': 'application/json', 'access-control-allow-origin': '*'})
    def eng(route):
        engine_calls.append(route.request.post_data)
        h = {'content-type': 'application/json', 'access-control-allow-origin': SITE}
        if eng_mode == 'down': return route.fulfill(status=502, body='bad', headers={'content-type': 'text/plain'})
        route.fulfill(status=200, body=json.dumps({'ok': True, 'stored': False, 'backup_saved': '_backup=1' in (route.request.post_data or '')}), headers=h)
    return fs, eng, site, engine_calls, fs_calls

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(**p.devices['iPhone 13'])
    for fs_mode, eng_mode, expect in [('521', 'up', 'success'), ('521', 'down', 'error'), ('ok', 'up', 'success')]:
        page = ctx.new_page()
        fs, eng, site, ec, fc = run(None, fs_mode, eng_mode)
        page.route('https://formsubmit.co/**', fs)
        page.route('https://campushealthcoach-engine.fly.dev/**', eng)
        page.route(SITE + '/**', site)
        page.goto(SITE + '/')
        ph = page.locator('#phone')
        # formatting checks (first scenario only)
        if fs_mode == '521' and eng_mode == 'up':
            for typed, want in [('6175551234', '617-555-1234'), ('16175551234', '617-555-1234'), ('617555', '617-555'), ('61755512349999', '617-555-1234')]:
                ph.fill(''); ph.press_sequentially(typed); check(f'type {typed}', ph.input_value() == want, ph.input_value())
            for pasted in ['+1 (617) 555-1234', '617.555.1234', ' 617 555 1234 ']:
                ph.fill(''); ph.focus(); page.keyboard.insert_text(pasted); check(f'paste {pasted!r}', ph.input_value() == '617-555-1234', ph.input_value())
            ph.fill(''); ph.press_sequentially('6175551234'); ph.press('ArrowLeft'); ph.press('ArrowLeft'); ph.press('ArrowLeft'); ph.press('ArrowLeft'); ph.press('ArrowLeft'); ph.press('Backspace')
            check('mid backspace', ph.input_value() == '617-551-234' and ph.evaluate('e=>e.selectionStart') == 6, ph.input_value())
        page.fill('#name', 'TEST DO NOT APPROVE')
        page.fill('#email', 'test@example.com')
        ph.fill(''); ph.press_sequentially('+1 617 555 0242')
        page.locator('label.coach-card').nth(1).click()
        if page.locator('#sms_consent').count(): page.locator('#sms_consent').check()
        page.click('#submit-btn')
        page.wait_for_timeout(2500)
        ok_vis = page.locator('#form-success').is_visible()
        err = page.locator('#submit-error')
        err_vis = err.count() and err.is_visible()
        check(f'FormSubmit={fs_mode} engine={eng_mode} -> {expect}', ok_vis if expect == 'success' else (err_vis and not ok_vis), f'success={ok_vis} err={bool(err_vis)} engine_calls={len(ec)}')
        if fs_mode == '521' and eng_mode == 'up':
            body = ec[-1] if ec else ''
            check('backup body has _backup + normalized phone', '_backup=1' in body and 'phone=617-555-0242' in body, body[:200])
        if fs_mode == 'ok':
            sent = [c for c in fc if c]
            check('FormSubmit got normalized phone', sent and json.loads(sent[-1])['phone'] == '617-555-0242')
            check('engine background notify sent (texting opted in)', len(ec) == 1 and '_backup' not in ec[0])
        page.close()
    # validation: bad number
    page = ctx.new_page(); fs, eng, site, ec, fc = run(None, 'ok', 'up')
    page.route(SITE + '/**', site); page.route('https://formsubmit.co/**', fs); page.route('https://campushealthcoach-engine.fly.dev/**', eng)
    page.goto(SITE + '/'); page.fill('#name', 'X Y'); page.fill('#email', 'a@b.co'); page.locator('#phone').press_sequentially('555123')
    page.locator('label.coach-card').first.click(); page.click('#submit-btn'); page.wait_for_timeout(500)
    check('short phone shows field error, nothing sent', page.locator('.error-msg[data-for="phone"]').is_visible() and not fc, page.locator('.error-msg[data-for="phone"]').text_content())
    b.close()
sys.exit(0 if all(r[1] for r in results) else 1)
