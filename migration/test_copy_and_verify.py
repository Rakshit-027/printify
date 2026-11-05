import datetime as dt
import unittest

from copy_and_verify import comparable, mysql_config, verify_rows


class MigrationChecks(unittest.TestCase):
    def test_mysql_url_requires_database_and_decodes_password(self):
        config = mysql_config("mysql://app:p%40ss@127.0.0.1:3306/printify")
        self.assertEqual(config["password"], "p@ss")
        self.assertEqual(config["database"], "printify")
        with self.assertRaises(ValueError):
            mysql_config("postgresql://user:pass@localhost/db")

    def test_json_array_is_compared_as_array(self):
        verify_rows("Coupon", ["id", "applicablePlanCodes"],
                    [{"id": "original", "applicablePlanCodes": ["PRO", "STARTER"]}],
                    [{"id": "original", "applicablePlanCodes": '["PRO","STARTER"]'}])
        with self.assertRaises(ValueError):
            verify_rows("Coupon", ["id", "applicablePlanCodes"],
                        [{"id": "original", "applicablePlanCodes": '["PRO"]'}],
                        [{"id": "original", "applicablePlanCodes": '["STARTER"]'}])

    def test_timestamp_precision_and_utc(self):
        moment = dt.datetime(2026, 11, 3, 8, 30, 14, 123456, tzinfo=dt.timezone.utc)
        self.assertEqual(comparable(moment, False), "2026-11-03T08:30:14.123456")
        with self.assertRaises(ValueError):
            verify_rows("Order", ["id", "createdAt"],
                        [{"id": "order", "createdAt": moment}],
                        [{"id": "order", "createdAt": dt.datetime(2026, 11, 3, 8, 30, 14, 123000)}])

    def test_duplicate_or_missing_ids_fail(self):
        with self.assertRaises(ValueError):
            verify_rows("Order", ["id"], [{"id": "x"}, {"id": "x"}], [{"id": "x"}])


if __name__ == "__main__":
    unittest.main()
