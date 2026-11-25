import unittest,json
import pilot as p
class DiscoveryTests(unittest.TestCase):
    def test_dataset(self):
        cs=p.load()
        self.assertEqual(len(cs),16)
        self.assertEqual(len({c["family"] for c in cs}),8)
        self.assertTrue(all(c["request"] for c in cs))
    def test_valid_grade(self):
        g={"ratings":[{"score":2,"quote":"A real clue"},{"score":0,"quote":""},{"score":1,"quote":"real clue"}],"unsupported":0,"unsupported_quote":"","harmful":0,"harmful_quote":""}
        self.assertEqual(p.parse_grade(json.dumps(g),"A real clue."),g)
        g["ratings"][0]["quote"]="not in answer"
        self.assertIsNone(p.parse_grade(json.dumps(g),"A real clue."))
    def test_bad_grade(self):
        self.assertIsNone(p.parse_grade("not json","text"))
        self.assertIsNone(p.parse_grade('{"ratings":[]}',"text"))
if __name__=="__main__":unittest.main()
