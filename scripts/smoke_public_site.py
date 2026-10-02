"""Dependency-free checks for the public, static Rheo website."""

from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
VOID = set("area base br col embed hr img input link meta param source track wbr".split())


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = set()
        self.links = []
        self.stack = []
        self.headings = 0
        self.contact = False
        self.canonical = None
        self.feed(path.read_text())
        assert not self.stack, (path, self.stack)
        assert self.headings == 1, (path, "one h1 required")
        assert self.contact, (path, "public contact missing")

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        assert tag not in {"script", "iframe", "form"}, (self.path, tag)
        assert not any(key.startswith("on") for key in attrs), "No event handlers"
        if "id" in attrs:
            assert attrs["id"] not in self.ids, "Duplicate ID"
            self.ids.add(attrs["id"])
        if tag == "h1":
            self.headings += 1
        if tag == "img":
            assert all(key in attrs for key in ("alt", "width", "height")), attrs
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        for key in ("href", "src"):
            if key in attrs:
                self.links.append(attrs[key])
                if attrs[key].startswith("mailto:"):
                    assert urlsplit(attrs[key]).path == "info@rheocracy.org"
                    self.contact = True
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        assert self.stack and self.stack.pop() == tag, (self.path, tag)


pages = {name: Page(ROOT / name) for name in ("index.html", "privacy.html")}
for name, page in pages.items():
    expected = "https://rheocracy.org/" + ("" if name == "index.html" else name)
    assert page.canonical == expected
    for link in page.links:
        url = urlsplit(link)
        assert url.scheme in {"", "https", "mailto"}, link
        if url.scheme:
            continue
        target_name = unquote(url.path) or name
        target = (ROOT / target_name).resolve()
        assert target.is_relative_to(ROOT) and target.is_file(), link
        if url.fragment and target_name in pages:
            assert url.fragment in pages[target_name].ids, link
    print(f"PASS {name}: structure, heading, images, links, anchors, contact, canonical")

source = ROOT / "assets/rheo-ident-final.svg"
assert sha256(source.read_bytes()).hexdigest() == "7747c3d9c9a28622eb3c0d110fd7be9d6d77451bbe88d2c0c7fec31fa432e2e3"
namespace = {"svg": "http://www.w3.org/2000/svg"}
lotus = ET.parse(source).find(".//svg:path", namespace).get("d")
header = ET.parse(ROOT / "assets/lotus.svg")
assert header.getroot().get("viewBox") == "180 50 320 224"
assert all(path.get("d") == lotus for path in header.findall(".//svg:path", namespace))
print("PASS approved brand: unchanged source SVG and exact app lotus path")
print("PASS static website: no scripts, embeds, forms or insecure resource links")
