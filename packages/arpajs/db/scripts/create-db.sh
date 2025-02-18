#!/bin/bash
# Pass database name as parameter

set -e

while getopts d: OPT; do
	case "$OPT" in
		d) DB=$OPTARG ;;
		*) echo "Usage $0 -d db-database" ; exit 1;;
	esac
done

shift $((OPTIND-1))

DDL_FILE=$1

if [ -z "$DDL_FILE" ] ; then
	echo "Give SQL input file as a parameter" 1>&2
	exit 1
fi

if ! [ -e "$DDL_FILE" ] ; then
	echo "No such file '$DDL_FILE'" 1>&2
	exit 1
fi

# Local database
PSQL="psql $DB"
echo "creating database $DB"
createdb --template=template0 --locale=fi_FI.UTF-8 --encoding=UTF-8 $DB || true

$PSQL -q -f "${DDL_FILE}"
true
