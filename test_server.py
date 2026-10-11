"""
HTTP Server and Asset Delivery Test for CalcTG
"""
import http.server
import socketserver
import threading
import urllib.request
import time
import unittest

PORT = 8765

class TestStaticServer(unittest.TestCase):
  @classmethod
  def setUpClass(cls):
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
      def log_message(self, format, *args):
        pass

    cls.httpd = socketserver.TCPServer(('127.0.0.1', PORT), QuietHandler)
    cls.server_thread = threading.Thread(target=cls.httpd.serve_forever, daemon=True)
    cls.server_thread.start()
    time.sleep(0.5)

  @classmethod
  def tearDownClass(cls):
    cls.httpd.shutdown()
    cls.httpd.server_close()

  def test_index_page(self):
    req = urllib.request.urlopen(f'http://127.0.0.1:{PORT}/index.html')
    self.assertEqual(req.status, 200)
    content = req.read().decode('utf-8')
    self.assertIn('Калькулятор стоимости услуги', content)
    self.assertIn('START10', content)

  def test_css_asset(self):
    req = urllib.request.urlopen(f'http://127.0.0.1:{PORT}/css/styles.css')
    self.assertEqual(req.status, 200)
    css = req.read().decode('utf-8')
    self.assertIn('--tg-theme-button-color', css)
    self.assertIn('--safe-top', css)

  def test_js_assets(self):
    for f in ['calculator.js', 'tg-adapter.js', 'app.js']:
      req = urllib.request.urlopen(f'http://127.0.0.1:{PORT}/js/{f}')
      self.assertEqual(req.status, 200)
      body = req.read().decode('utf-8')
      self.assertGreater(len(body), 500)

if __name__ == '__main__':
  unittest.main()
