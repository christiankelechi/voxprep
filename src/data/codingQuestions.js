export const codingQuestions = [
  {
    id: 1,
    title: "Level 1: Basic Operations",
    description: `Create an InMemoryDB that supports two basic operations:
1. 'set_at(key, value)': Stores the value at the given key. If the key already exists, updates the value.
2. 'get_at(key)': Returns the value associated with the key. If the key doesn't exist, return an empty string "".

Both 'key' and 'value' will always be strings.`,
    initialCode: `class InMemoryDB:
    def __init__(self):
        pass

    def set_at(self, key, value):
        pass

    def get_at(self, key):
        pass`,
    testCases: [
      {
        code: `db = InMemoryDB()\ndb.set_at("A", "B")\nresult = db.get_at("A")\nresult`,
        expected: "B"
      },
      {
        code: `db = InMemoryDB()\nresult = db.get_at("NonExistent")\nresult`,
        expected: ""
      },
      {
        code: `db = InMemoryDB()\ndb.set_at("A", "1")\ndb.set_at("A", "2")\nresult = db.get_at("A")\nresult`,
        expected: "2"
      }
    ]
  },
  {
    id: 2,
    title: "Level 2: Delete Operation",
    description: `Extend your InMemoryDB to support deletion:
3. 'delete_at(key)': Removes the key-value pair from the database. Returns True if the key existed and was deleted, or False if the key didn't exist.`,
    initialCode: `class InMemoryDB:
    def __init__(self):
        pass

    def set_at(self, key, value):
        pass

    def get_at(self, key):
        pass

    def delete_at(self, key):
        pass`,
    testCases: [
      {
        code: `db = InMemoryDB()\ndb.set_at("X", "Y")\nres1 = db.delete_at("X")\nres2 = db.get_at("X")\n[res1, res2]`,
        expected: [true, ""]
      },
      {
        code: `db = InMemoryDB()\nres = db.delete_at("None")\nres`,
        expected: false
      }
    ]
  },
  {
    id: 3,
    title: "Level 3: Scan by Prefix",
    description: `Add a 'scan_by_prefix' operation to your InMemoryDB:
4. 'scan_by_prefix(prefix)': Returns a list of strings representing the key-value pairs where the key starts with the given prefix. Format each pair as "key=value". Sort the results alphabetically by key. If no keys match, return an empty list.`,
    initialCode: `class InMemoryDB:
    def __init__(self):
        pass

    def set_at(self, key, value):
        pass

    def get_at(self, key):
        pass

    def delete_at(self, key):
        pass

    def scan_by_prefix(self, prefix):
        pass`,
    testCases: [
      {
        code: `db = InMemoryDB()\ndb.set_at("app", "1")\ndb.set_at("apple", "2")\ndb.set_at("banana", "3")\ndb.set_at("applet", "4")\nresult = db.scan_by_prefix("app")\nresult`,
        expected: ["app=1", "apple=2", "applet=4"]
      },
      {
        code: `db = InMemoryDB()\nresult = db.scan_by_prefix("xyz")\nresult`,
        expected: []
      }
    ]
  }
];
