#!/bin/bash

MYSQL=`which mysql`

Q1="CREATE DATABASE IF NOT EXISTS $MYSQL_DB;"
Q2="GRANT USAGE ON *.* TO $MYSQL_USER@localhost IDENTIFIED BY '$MYSQL_PASSWORD';"
Q3="GRANT ALL PRIVILEGES ON $MYSQL_DB.* TO $MYSQL_USER@localhost;"
Q4="FLUSH PRIVILEGES;"
SQL="${Q1}${Q2}${Q3}${Q4}"

$MYSQL -uroot --password="$MYSQL_ROOT_PASSWORD" -e "$SQL"