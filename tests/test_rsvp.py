import unittest
import json, sys
from api._lib.rsvp_service import normalizeName, normalizePhone, validateRSVPInput

class TestRSVPServices(unittest.TestCase):
    def test_normalize_name(self):
        self.assertEqual(normalizeName('  CAMILA  Pérez  '), 'camila perez')
        self.assertEqual(normalizeName('Felipe Valenzuela'), 'felipe valenzuela')

    def test_normalize_phone(self):
        self.assertEqual(normalizePhone('+56 9 8139 3436'), '+56981393436')
        self.assertEqual(normalizePhone('56981393436'), '56981393436')
        self.assertIsNone(normalizePhone('++56981393436'))
        self.assertIsNone(normalizePhone('phone123'))
        self.assertIsNone(normalizePhone('1234'))

    def test_validate_rsvp_input(self):
        v1 = validateRSVPInput({'first_name': 'Camila', 'last_name': 'Pérez', 'phone': '+56981393436', 'attendance_status': 'attending', 'dietary_type': 'Vegano'})
        self.assertTrue(v1['valid'])

        v2 = validateRSVPInput({'first_name': 'Camila', 'last_name': 'Pérez', 'phone': '+56981393436', 'attendance_status': 'not_attending'})
        self.assertTrue(v2['valid'])
        self.assertIsNone(v2['data']['dietary_type'])

        v3 = validateRSVPInput({'first_name': 'Camila', 'last_name': 'Pérez', 'phone': '+56981393436', 'attendance_status': 'pending'})
        self.assertTrue(v3['valid'])

        v4 = validateRSVPInput({'first_name': 'C', 'last_name': 'P', 'phone': '123', 'attendance_status': 'invalid'})
        self.assertFalse(v4['valid'])

if __name__ == '__main__':
    unittest.main()
