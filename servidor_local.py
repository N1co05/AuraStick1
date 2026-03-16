import http.server
import socketserver
import webbrowser
import os

PORT = 8000
Handler = http.server.SimpleHTTPRequestHandler

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f"--- SERVIDOR LOCAL AURA STICKERS ---")
print(f"Iniciando servidor en http://localhost:{PORT}")
print(f"Cerrá esta ventana para detener el servidor.")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    webbrowser.open(f"http://localhost:{PORT}/index.html")
    httpd.serve_forever()
