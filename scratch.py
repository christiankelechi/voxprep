import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req = urllib.request.Request('https://api.groq.com/openai/v1/models', headers={'Authorization': 'Bearer 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'})
try:
    res = urllib.request.urlopen(req, context=ctx)
    data = json.loads(res.read())
    print([m['id'] for m in data['data']])
except Exception as e:
    print("Error:", e)
