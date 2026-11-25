import unittest
import pilot as p
class PilotTests(unittest.TestCase):
    def test_worlds_and_reference(self):
        fs=p.load()
        self.assertEqual(sum(len(f["worlds"]) for f in fs),16)
        ref=p.reference(fs)
        self.assertLess(ref["best_fixed_rate"],ref["informed_oracle_rate"])
        self.assertEqual(ref["informed_oracle_rate"],1)
    def test_public_no_keys(self):
        for f in p.load():
            visible,qm,am=p.public(f,42)
            self.assertEqual(set(visible),{"scenario","goal","available_checks","interventions"})
            self.assertEqual(set(qm.values()),{0,1,2})
            self.assertEqual(set(am.values()),{0,1,2,3})
            self.assertEqual(p.public(f,42),p.public(f,42))
    def test_delay_and_invalid(self):
        w=next(f for f in p.load() if f["id"]=="safety")["worlds"][0]
        self.assertEqual(p.evaluate(w,0,0)["success"],1)
        self.assertEqual(p.evaluate(w,1,0)["success"],0)
        self.assertFalse(p.evaluate(w,None,0)["valid"])
        self.assertFalse(p.evaluate(w,0,None)["valid"])
    def test_parser(self):
        self.assertIsNone(p.parse("not json",("action_id",)))
        self.assertIsNone(p.parse('{"action_id":1}',("action_id",)))
        self.assertEqual(p.parse('{"action_id":"1"}',("action_id",))["action_id"],"1")
if __name__=="__main__":unittest.main()
