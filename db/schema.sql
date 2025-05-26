CREATE TABLE IF NOT EXISTS prices (
                                      id          INTEGER PRIMARY KEY AUTOINCREMENT,
                                      date        TEXT    NOT NULL,   -- yyyy-mm-dd
                                      product     TEXT    NOT NULL,
                                      price       REAL    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_date ON prices(product, date);
