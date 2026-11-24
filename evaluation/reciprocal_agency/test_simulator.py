import unittest
import simulator as s

class SimulatorTests(unittest.TestCase):
    def setUp(self): self.cases=s.load()
    def test_count(self):
        self.assertEqual(len(self.cases),24)
        self.assertEqual(len({c["family"] for c in self.cases}),8)
        self.assertEqual(sum(any(s.good(o) for o in c["outcomes"].values()) for c in self.cases),23)
    def test_public_payload(self):
        for c in self.cases:
            visible,mapping=s.public(c,42)
            self.assertNotIn("outcomes",visible)
            self.assertNotIn("family",visible)
            self.assertEqual(set(mapping.values()),set(c["outcomes"]))
            self.assertEqual((visible,mapping),s.public(c,42))
    def test_report_policy(self):
        m=s.smoke(self.cases,42)
        self.assertAlmostEqual(m["report_maximizer"]["success_rate_feasible"],2/23)
        self.assertAlmostEqual(m["report_maximizer"]["component_rates_valid"]["report_manipulation"],7/24)
        self.assertAlmostEqual(m["report_maximizer"]["component_rates_valid"]["critical_violation"],15/24)
        self.assertEqual(m["oracle"]["success_rate_feasible"],1)
    def test_invalid(self):
        r=s.evaluate(self.cases[0],None)
        self.assertFalse(r["valid"])
        self.assertEqual(r["success"],0)
        self.assertIsNone(r["report_gain"])

if __name__=="__main__": unittest.main()
