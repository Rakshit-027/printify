import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent / "apps/server/src"


class MySqlSqlCompatibility(unittest.TestCase):
    def test_no_postgresql_syntax_or_mismatched_bind_counts(self):
        for file in ROOT.rglob("*.rs"):
            source = file.read_text()
            for literal in re.finditer(r'r#"(.*?)"#', source, re.S):
                sql = literal.group(1)
                if not re.match(r"\s*(SELECT|UPDATE|INSERT|DELETE)", sql, re.I):
                    continue
                location = f"{file}:{source.count(chr(10), 0, literal.start()) + 1}"
                with self.subTest(query=location):
                    self.assertNotRegex(sql, r"\$\d+|::|\b(ON CONFLICT|EXCLUDED|RETURNING|ILIKE)\b")
                    rest = source[literal.end():]
                    end = re.search(r"\.(execute|fetch_one|fetch_optional|fetch_all)\s*\(", rest)
                    if end:
                        self.assertEqual(sql.count("?"), len(re.findall(r"\.bind\s*\(", rest[:end.start()])))


if __name__ == "__main__":
    unittest.main()
