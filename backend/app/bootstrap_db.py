from pathlib import Path

import pandas as pd

from app.database import engine


def bootstrap_table(
    connection, file: Path, if_exists="append", index=False, chunksize=10000
):
    # Database table name is assumed to match csv file name
    name = file.stem

    # Read CSV into a DataFrame one chunk at a time
    for chunk in pd.read_csv(file, chunksize=chunksize):
        # Write to SQL using the SQLAlchemy engine
        chunk.to_sql(
            name=name,
            con=connection,
            if_exists=if_exists,  # Options: 'fail', 'replace', 'append'
            index=index,  # Drop DataFrame index column
            method="multi",
        )


bootstrap_data_dir = Path(__file__).parent.parent.parent / "database/bootstrap"
with engine.connect() as connection, connection.begin():
    for csv_file in bootstrap_data_dir.glob("*.csv"):
        bootstrap_table(
            connection=connection,
            file=csv_file,
            if_exists="append",
            index=False,
            chunksize=10000,
        )
