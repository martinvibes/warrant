#!/usr/bin/env sh
# Dependencies are not vendored. Fetch them at the versions the tests were written against.
set -e
forge install foundry-rs/forge-std@v1.9.6 --no-git
forge install OpenZeppelin/openzeppelin-contracts@v5.6.1 --no-git
