################################################################################
### This file contains the shell scripts that are run by the npm package manager.
### because it is easier to write shell scripts here than in the package.json file.
### The scripts are called by running `npm run <script-name>`.
### Every script in package.json should contain the same code:
###   "script-name": ". \"$(npm prefix)/package.json.scripts.sh\" && $( echo ${npm_lifecycle_event} | tr ':' '_' )"
### Let me explain this:
###  * . will source this file
###  * npm prefix will make sure we'll read it relative to the root of the project
###  * $( echo ${npm_lifecycle_event} | tr ':' '_' )
###    will call the function with the same name as the current script name (${npm_lifecycle_event})
###    but it will replace any colons with an underscore to translate the script name
###    into a valid POSIX shell function name
################################################################################

# prepare -> will set the git core.hooksPath to ./git-hooks
prepare() {
  if [ -d .git ]; then
    git config core.hooksPath ./git-hooks \
      && echo "git core.hooksPath has been set to: $(git config core.hooksPath)";
  else
    echo "Not setting git core.hooksPath (installed as a dependency)";
  fi

  # check if the files as defined in package.json, main and module exist
  # read the package.json file, and extract the main and module fields
  local MAIN=$(node -p 'require("./package.json").main')
  local MODULE=$(node -p 'require("./package.json").module')

  if [ "$MAIN" != "" ] && [ ! -f "$MAIN" ]; then
    echo "[sri4node prepare script] The main file '$MAIN' as defined in package.json does not exist, so we'll run 'npm run build:esbuild'"
    npm run build:esbuild && touch ./dist/CREATED_BY_NPM_PREPARE
  elif [ "$MODULE" != "" ] && [ ! -f "$MODULE" ]; then
    echo "[sri4node prepare script] The module file '$MODULE' as defined in package.json does not exist, so we'll run 'npm run build:esbuild'"
    npm run build:esbuild && touch ./dist/CREATED_BY_NPM_PREPARE
  else
    echo "[sri4node prepare script] dist/ folder exists and seems to contain the right files, so we won't be running 'npm run build:esbuild' in order to savesome time"
  fi
}

# prebuild -> will clean the dist folder
prebuild() {
  npm run clean
}

# build -> will build the project using tsc
build(){
  tsc --project .
}

# build:esbuild -> will build the project using esbuild
build_esbuild() {
  node esbuild.config.js && tsc --emitDeclarationOnly --declaration
}

# clean -> will remove the dist folder
clean() {
  rm -rf ./dist
}

# pretest:old -> will clean the dist folder, create the ./dist/js folder and run the postbuild script
pretest_old() {
  npm run clean && mkdir -p ./dist/js && npm run postbuild && (npm run test:cleanup || /bin/true)
}

# pretest -> will build the project using esbuild and run the test:cleanup script
pretest() {
  npm run build:esbuild && (npm run test:cleanup || /bin/true)
}

# test -> will run the tests
test() {
  if [ "$1" != "" ]; then
    PICK="--pick ${@}"
    echo "$PICK\n"
  fi

  npm run test:cleanup
  ( cd $(npm prefix)/docker && SRI4NODE_TESTS_NODE_VERSION=$(node --version) docker compose up --wait sri4nodepostgresdbfortests ) &&
    ./node_modules/.bin/mocha --exit --require ts-node/register ./test/tests.ts ${PICK}
  R=$?
  npm run test:cleanup
  echo '\n\n********\nDid you know you can run only a subset of the tests?\n  Example: npm run test ./testBatch.ts\n********\n'
  return $R
}

# test:on_docker -> will run the tests on docker
#                   given the node and postgres (docker container) versions as arguments
# Example: npm run test:on_docker -- [--continue] 16,11-alpine 16,12-alpine 18,12 20,15
#         The --continue flag will make the script continue running the tests even if one of them fails
test_on_docker() {
  if [ $1 = '--continue' ]; then
    printf "\e[1;36m%s\e[0m\n" "  ======== --continue flag detected ========"
    local CONTINUE='true'
    shift 1
  else
    printf "\e[1;36m%s\e[0m\n" "  ======== No --continue flag detected, tests will stop on first failure ========"
  fi

  local NODEANDPOSTGRESVERSIONS=$@
  if [ "$NODEANDPOSTGRESVERSIONS" = "" ]; then
    echo 'Error: pass 'node,postgres' versions as arguments (example npm run test:on_docker -- [--continue] 16,11-alpine 16,12-alpine 18,12-alpine 20,15-alpine)'
    return 1
  fi

  (
    (npm run test:cleanup || true) &&
    cd $(npm prefix)/docker &&
    for NODEANDPOSTGRESVERSION in $NODEANDPOSTGRESVERSIONS; do
      NODEVERSION=$(echo "$NODEANDPOSTGRESVERSION" | awk -F',' '{print $1}')
      POSTGRESVERSION=$(echo "$NODEANDPOSTGRESVERSION" | awk -F',' '{print $2}')
      echo
      printf "\e[1;33m%s\e[0m\n" "======== Running tests on node ${NODEVERSION} and postgres ${POSTGRESVERSION} ========"
      echo
      export SRI4NODE_TESTS_POSTGRES_VERSION=$POSTGRESVERSION
      export SRI4NODE_TESTS_NODE_VERSION=$NODEVERSION
      # use exit code from sri4nodetests container, and ONLY RUN srinodetests container (hence the 2 times)
      docker compose up --exit-code-from sri4nodetests sri4nodetests
      EXITCODE=$?
      echo

      if [ ${EXITCODE} -eq 0 ]; then
        local MSG="$( printf "\e[1;33m%s\e[0m\n" "======== Tests on node ${NODEVERSION} and postgres ${POSTGRESVERSION} were successful ========" )"
      else
        local MSG="$( printf "\e[1;31m%s\e[0m\n" "======== Tests on node ${NODEVERSION} and postgres ${POSTGRESVERSION} FAILED with exit code $EXITCODE ========" )"
      fi
      ### bring the database server down, but no other cleanup so we could
      ### reuse node docker container?
      ### Would speed up matrix testing, (because npm cache can be used),
      ### but would be even faster if the npm install is only done when needed
      docker compose stop sri4nodepostgresdbfortests && docker compose rm -f sri4nodepostgresdbfortests
      # npm run test:cleanup
      printf "\n$MSG\n"
      local ALL_MESSAGES="$ALL_MESSAGES\n$MSG"
      [ $EXITCODE -eq 0 ] || [ "$CONTINUE" = 'true' ] || return $EXITCODE
    done
    npm run test:cleanup
    printf "============\nTEST RESULTS\n============\n\n${ALL_MESSAGES}\n"
  )
}

# test:inside_docker -> used to run the tests from inside a docker container,
#                       so not to be called by hand
test_inside_docker() {
  npm run build:esbuild &&
    if [ "$1" != "" ]; then
      PICK="--pick ${@}"
      echo "$PICK\n"
    fi
  INSIDE_DOCKER='true' ./node_modules/.bin/mocha --exit --require ts-node/register ./test/tests.ts ${PICK}
  R=$?
  echo '\n\n********\nDid you know you can run only a subset of the tests?\n  Example: npm run test test/testBatch.ts   (or test/testB* would also work)\n********\n'
  return $R
}

### test:bundles -> will run the tests against the compiled bundles (CJS and ESM module) to check whether they are ok
test_bundles() {
  SRI4NODE_TEST_MODULE_TYPE=CJS npm run test
  SRI4NODE_TEST_MODULE_TYPE=ESM npm run test
}

# test:cleanup -> will remove the test database
test_cleanup() {
  ( cd "$(npm prefix)/docker" && docker compose down --rmi=local --remove-orphans )
}

# test:performance -> will run the performance tests
test_performance() {
  mocha --config .mocharc_performance.js --exit
}

# test:common -> will run the tests in the common folder
test_common() {
  npm run test -- $(cd ./test && find ./common -iname '*')
}

# lint -> will run eslint
lint() {
  npx eslint sri4node.ts js test
}

# preversion -> will run the tests and build the project
# Do not use this script directly, use the release script instead
preversion() {
  if [ $(git symbolic-ref --short HEAD) != 'master' ]; then
    echo '[version] Bumping the version should only be done on the master branch.' && exit 1
  fi

  npm run test:bundles &&
  npm run build:esbuild &&
  git add -f dist/
}

# version -> will check if the release notes are up to date and bump the version
# Do not use this script directly, use the release script instead
version() {
  if [ $(git symbolic-ref --short HEAD) != 'master' ]; then
    echo '[version] Bumping the version should only be done on the master branch.' && exit 1
  fi

  NEW_VERSION=$(node -p 'require("./package.json").version')
  RELEASEDATESTR="$(date +'%d-%m-%Y')"

  if [ "$(grep "## version $NEW_VERSION ($RELEASEDATESTR)" RELEASENOTES.md)" = '' ]; then
    echo "[version] Make sure the new version ($NEW_VERSION) has release notes in RELEASENOTES.md and the date matches today." &&
    git reset &&
    exit 1
  fi

  ### && echo "Commit a new version v${NEW_VERSION}" && git commit -m "Bump version to v${NEW_VERSION}" && echo "Tag the new version v${NEW_VERSION}" && git tag --annotate "v${NEW_VERSION}" --message "Version v${NEW_VERSION}"
}

# postversion -> will push the changes and the tags
# Do not use this script directly, use the release script instead
postversion() {
  if [ $(git symbolic-ref --short HEAD) != 'master' ]; then
    echo '[version] Bumping the version should only be done on the master branch.' && exit 1
  fi

  git push && git push --tags
}

# release -> will bump the version and create a new release
# Example: npm run release -- minor
# This is the scrript to use to release a new version of the package !!!
release() {
  echo "[release] $1"
  [ "$1" != 'major' ] && [ "$1" != 'minor' ] && [ "$1" != 'patch' ] && echo "We need 1 parameter with value major|minor|patch instead of '$1'.
Example: npm run release -- minor" && exit 1
  npm version $1 --message "Version %s\n\nChanges:\n\n"
}
