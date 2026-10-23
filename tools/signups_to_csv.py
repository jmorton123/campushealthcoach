#!/usr/bin/env python3
"""Build /workspace/signups.csv from FormSubmit sign-up emails in Gmail.

Every sign-up on campushealthcoach.com is emailed by FormSubmit to
j.jeffmorton@gmail.com with subject "New CampusHealthCoach early-access signup".

How to refresh the list (an agent with the Gmail connector does steps 1-2):
  1. search_emails  query:
       from:submissions@formsubmit.co subject:"New CampusHealthCoach early-access signup"
  2. read_email each result with messageFormat FULL_CONTENT and write_to_file=true
     (or save the JSON however you like) into one folder, e.g. /workspace/signup-emails/
  3. python3 tools/signups_to_csv.py /workspace/signup-emails/*.txt
     -> writes /workspace/signups.csv (merged with any rows already there,
        de-duplicated by Gmail message id, newest first).

Rows whose name/email/school look like tests are kept but flagged is_test=yes.
"""
import csv, html, json, os, re, sys

OUT = os.environ.get("SIGNUPS_CSV", "/workspace/signups.csv")
FIELDS = ["submitted_at", "name", "email", "phone", "school", "coach",
          "sms_consent", "sms_consent_timestamp", "sms_consent_text",
          "page_url", "is_test", "gmail_message_id", "email_date"]


def load_message(path):
    text = open(path, encoding="utf-8").read()
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("{") and '"id"' in line:
            return json.loads(line)
    return json.loads(text)


def parse_fields(msg):
    out = {}
    h = msg.get("htmlBody") or ""
    rows = re.findall(r"<td[^>]*>\s*<strong>(.*?)</strong>\s*</td>\s*<td[^>]*>(.*?)</td>", h, re.S)
    for k, v in rows:
        v = re.sub(r"<[^>]+>", "", v)
        out[html.unescape(k).strip()] = html.unescape(v).strip()
    if not out:  # plain-text fallback: "key\t\r\n ... value\t"
        body = msg.get("body") or ""
        toks = [html.unescape(t.strip()) for t in re.split(r"\t", body)]
        toks = [t for t in toks if t]
        for i, t in enumerate(toks[:-1]):
            if t in FIELDS:
                out[t] = toks[i + 1]
    return out


def is_test(r):
    blob = " ".join([r.get("name", ""), r.get("email", ""), r.get("school", "")]).lower()
    return "yes" if re.search(r"test|example\.com|safe to delete", blob) else "no"


def main(paths):
    rows = {}
    if os.path.exists(OUT):
        for r in csv.DictReader(open(OUT, encoding="utf-8")):
            rows[r.get("gmail_message_id")] = r
    added = 0
    for p in paths:
        msg = load_message(p)
        if "early-access signup" not in (msg.get("subject") or ""):
            continue
        f = parse_fields(msg)
        r = {k: f.get(k, "") for k in FIELDS}
        if not r["submitted_at"]:
            r["submitted_at"] = msg.get("date", "")
        r["gmail_message_id"] = msg.get("id", "")
        r["email_date"] = msg.get("date", "")
        r["is_test"] = is_test(r)
        if r["gmail_message_id"] not in rows:
            added += 1
        rows[r["gmail_message_id"]] = r
    data = sorted(rows.values(), key=lambda r: r.get("submitted_at", ""), reverse=True)
    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS, extrasaction="ignore")
        w.writeheader()
        w.writerows(data)
    real = sum(1 for r in data if r.get("is_test") != "yes")
    print(f"{OUT}: {len(data)} rows ({real} real, {len(data)-real} test), {added} new")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1:])
