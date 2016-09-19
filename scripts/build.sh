#!/usr/bin/env bash

BASE_DIR=`pwd`
PACKAGE_NAME=`basename $BASE_DIR`
BUILD_DIR="$BASE_DIR/build"
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

mkdir -p $BUILD_DIR

if [ -e "${BUILD_DIR}/${PACKAGE_NAME}.zip" ]
then
  echo -e "${YELLOW}>> Removing existing package zip...${NC}"
  rm ${BUILD_DIR}/${PACKAGE_NAME}.zip
fi

echo -e "${GREEN}>> Pruning node modules to production only...${NC}"
npm install --production
npm prune --production

echo -e "${GREEN}>> Zipping package...${NC}"
zip -Tqr /tmp/${PACKAGE_NAME}.zip * -x "*test*"
mv /tmp/${PACKAGE_NAME}.zip $BUILD_DIR/${PACKAGE_NAME}.zip

# 50 MB
MAX_ZIP_SIZE=52428800
ZIP_SIZE=`wc -c < ${BUILD_DIR}/${PACKAGE_NAME}.zip`

if [ $ZIP_SIZE -ge $MAX_ZIP_SIZE ]; then
  echo -e "${YELLOW}>> Done, but zip size is over maximum 50 MB: build/$PACKAGE_NAME.zip${NC}"
else
  echo -e "${GREEN}>> Done: build/$PACKAGE_NAME.zip${NC}"
  exit 0
fi
