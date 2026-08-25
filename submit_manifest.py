import json, http.server, urllib.parse, webbrowser, requests

MANIFEST = open("manifest.json").read()
PORT = 8787

html = f"""
<html><body onload="document.forms[0].submit()">
<form action="https://github.com/settings/apps/new" method="post">
<input type="hidden" name="manifest" value='{MANIFEST}'>
</form>
Redirecting to GitHub...
</body></html>
"""

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/start"):
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(html.encode())
        elif self.path.startswith("/callback"):
            qs = urllib.parse.urlparse(self.path).query
            code = urllib.parse.parse_qs(qs)["code"][0]
            resp = requests.post(f"https://api.github.com/app-manifests/{code}/conversions",
                                  headers={"Accept": "application/vnd.github+json"})
            data = resp.json()
            with open(".env", "w") as f:
                f.write(f"GITHUB_APP_ID={data['id']}\n")
                f.write(f"GITHUB_APP_CLIENT_ID={data['client_id']}\n")
                f.write(f"GITHUB_APP_CLIENT_SECRET={data['client_secret']}\n")
                f.write(f"GITHUB_WEBHOOK_SECRET={data['webhook_secret']}\n")
            with open("github-app-private-key.pem", "w") as f:
                f.write(data["pem"])
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Done! App credentials saved to .env and github-app-private-key.pem. You can close this tab and go back to the terminal.")
            print("\nSaved credentials to .env and github-app-private-key.pem")
            print(f"App name/slug: {data['slug']}")

print(f"Open this in your browser: http://localhost:{PORT}/start")
webbrowser.open(f"http://localhost:{PORT}/start")
http.server.HTTPServer(("localhost", PORT), Handler).serve_forever()
