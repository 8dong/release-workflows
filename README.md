# Next.js release process with changesets

changesets을 이용한 Next.js 프로젝트 배포 프로세스입니다. github actions를 구성하여 배포 프로세스를 자동화하며, changesets을 함께 사용하여 release version, CHANGELOG, Deploy를 자동화합니다.


## Environment

packageManager은 yarn@4.5.0(yarn berry)를 사용하였으며, deploy는 sst(v^3.1.49)를 사용할 예정입니다.

### sst.config.ts

`yarn create sst` 명령어 실행시 프로젝트 루트에 sst 설정 파일(sst.config.ts)이 생성됩니다.

```javascript
// sst.config.ts

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'releases',
      home: 'aws',
      providers: {
        aws: {
          region: 'ap-northeast-2'
        }
      },
      removal: input?.stage === 'production' ? 'retain' : 'remove'
    }
  },
  async run() {
    new sst.aws.Nextjs('Release', {
      imageOptimization: {
        memory: '512 MB'
      }
    })
  }
})
```

- config: config 함수는 기본적인 배포 환경을 설정합니다. config 함수는 app, run 두 함수를 가집니다.

  - app: app 함수는 애플리케이션이 로드될 때 실행되는 함수

    - name: 프로젝트 이름을 설정하며, 이는 리소스의 prefix로 사용 (required)

    -  home: “aws” | “cloudflare” | “local” 와 같은 값을 작성할 수 있으며, 이는 애플리케이션 상태를 저장할 클라우드 제공자를 지정 (required)

    - providers: home에 설정된 클라우드 제공자 관련 설정 (optional)

    - removal: “remove” | “retain” | “retain-all”와 같은 값을 작성할 수 있으며 기본값은 "retain", 리소스 제거 정책을 설정하는 옵션이며 "remove"의 경우 리소스 제거, "retain"은 S3 buckets and DynamoDB tables 유지하며 이외 리소스들은 제거, "retain-all"은 모든 리소스 제거 (optional)

  - run: run 함수는 애플리케이션 리소스를 정의하기 위한 비동기 함수이며, 이 함수 내에서 AWS Lambda, API Gateway, DynamoDB 등과 같은 클라우드 리소스를 설정하고 구성 가능

    - sst.aws.Nextjs 생성자를 통해 Next.js 애플리케이션 리소스 관련 설정 가능

      - imageOptimization.memory: Next.js 애플리케이션에서 이미지 최적화 작업을 수행할 때 사용할 메모리의 양을 지정

      - domain: 사용자 정의 도메인 이름과 관련된 설정을 정의하는 속성
        
        - name: 사용자 정의 도메인

        - cert: SSL 인증서 ARN

      - environment: 배포시 사용될 환경변수 설정

### .changesets

changesets는 프로젝트 버전과 CHANGELOG 등 편라히게 관리해주는 라이브러리이며 Semver규칙에 따라 버전을 관리

`yarn chageset init` 명령어 실행시 프로젝트 루트에 .changeset 폴더가 생성

추가적으로 changeset 라이브러리 플러그인으로 @changesets/changelog-github를 사용하면 Github 리포지토리에 CHANGELOG를 자동으로 생성하고, 해당 플러그인은 Github API를 사용하여 커밋 메시지와 PR(pull request) 제목 및 설명을 기반으로 CHANGELOG 항목을 생성

#### config.json

아래는 `yarn changeset init` 명령어 실행시 생성되는 config 파일이며, 프로젝트 루트 경로에 .changeset/config.json으로 명령서 실행시 자동으로 생성

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.2/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "OWNER/REPO_NAME" }
  ],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [],
  "privatePackages": {
    "tag": true,
    "version": true
  }
}
```

- changelog: CHANGELOG를 생성할 방법을 정의

  - repo: CHANGELOG가 생성될 Gihub repo 명 작성

- commit: false로 설정시 Changesets는 자동으로 커밋을 만들지 않

- baseBranch: 기본 브랜치를 정의

- updateInternalDependencies: 내부 종속성의 업데이트 정책을 정의

- privatePackages: 비공식 패키지에 대한 동작을 정의, npm에 배포하지 않는 패키지라면 해당 옵션 추가

  - tag: true 설정시 패키지를 태그 관리 허용

  - version: true 설정시 패키지의 버전 관리 허용

#### changesets Command

`yarn changeset version` 명령어 실행시 .changeset 폴더의 마크다운 파일을 기반으로 이전에 기록한 변경 사항을 읽고 각 패키지에 대해 어떤 버전 변경이 필요한지를 결정하고, package.json의 version 정보를 변경시켜 줍니다. 또한 마크다운에 작성한 설명을 기반으로 CHANGELOG.md 파일을 업데이트, 변경된 version 정보와 업데이트된 CHANGELOG.md가 자동으로 commit, Release Note 작성을 자동으로 수행

```markdown
---
"패키지 이름": major | minor | patch
---

CHANGELOG.md에 작성될 내용 작성
```

위 파일처럼 .changeset 폴더 내 유니크한 이름의 markdown 파일을 생성하고 위 템플릿 형태로 작성하고 `yarn changeset version` 명령어를 실행

실행하면 해당 마크다운 파일 기반으로 version, CHANGELOG, Release Note가 업데이트 되고, 해당 마크다움 파일은 자동으로 제거

`yarn changeset version` 명령어 실행 이후 `yarn changeset tag` 명령어 실행하면 새로 업데이트된 버전 정보에 맞는 Git tag를 새롭게 생성하고 업데이트

## Github Actions

Github Actions를 사용하여 위 과정들을 자동화하고 추가적으로 배포까지 수행하는 workflow이며, 전체적인 틀은 아래와 같습니다.

dev와 main  브랜치 각각에 대한 배포 버전이 존재합니다. 아래부터는 dev 브랜치를 개발 버전, main 브랜치를 상용 버전이라 칭하겠습니다.

### dev-release.yml

- development release workflow의 경우 dev 브랜치에 commit이 push되는 경우에 수행

  - release jobs

    - environment

      - `runs-on: ubuntu-latest`: GitHub이 제공하는 최신의 Ubuntu 운영체제에서 워크플로우를 실행
      
      - `permissions`: 워크플로우가 실행되는 동안 특정 GitHub API 권한을 제어

        - `content: write`: 리포지토리 내용 수정 권한을 부여, 해당 권한을 통해 파일을 추가, 수정, 삭제할 수 있고, commit을 만들거나 푸시 가능

        - `pull-request: write`: 풀 리퀘스트(PR) 생성 및 업데이트 권한을 부여

    - steps

      - `name: Enable corepack`: Node.js의 패키지 매니저(Corepack)를 활성화, 해당 프로젝트는 yarn berry를 사용하므로 corepack을 통해 패키지의 yarn berry 버전을 보장되도록 보장해줌

      - `name: Install Node.js`: Node.js 기반 프로젝트로이르모 Node를 v18로 설치, yarn cache를 활성화하여 빌드 속도를 향상

      - `name: Install Dependencies`: 패키지 의존성 설치

      - `name: Configure AWS credentials`: AWS CLI 실행을 위한 credentials 설정

      - `name: Deploy`: sst 배포 수행

  - notification jobs

    - environment

      - `runs-on: ubuntu-latest`: GitHub이 제공하는 최신의 Ubuntu 운영체제에서 워크플로우를 실행

      - `needs: release`: release jobs 작업 완료된 후에만 실행

    - steps

      - `name: Send Slack notification`: release jobs 작업의 성공/실패 여부를 Slack 알림으로 전송


```yml
name: development release

on:
  push:
    branches: [dev]

jobs:
  release:

    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Enable corepack
      - uses: actions/checkout@v4
      - run: corepack enable

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: "yarn"

      - name: Install Dependencies
        run: yarn install

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: Deploy
        env:
          NEXT_PUBLIC_NODE_ENV: 'production'
        run: |
          yarn run deploy:dev

  notification:

    runs-on: ubuntu-latest
    needs: release
    if: always()

    steps:
      - name: Send Slack notification
        if: needs.release.outputs.published == 'true'
        uses: slackapi/slack-github-action@v1.26.0
        with:
          channel-id: "채널 ID"
          slack-message: "${{ github.repository }} 개발 배포 ${{ needs.release.result == 'success' &&  '✅ 성공' || '❌ 실패'}}"
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### prod-release.yml

- production release workflow의 경우 main 브랜치에 commit이 push되는 경우에 수행

  - release jobs

    - steps

      - `name: Create Release Pull Request`

        - `title: "chore: Development release"`: 생성될 PR의 타이틀

        - `commit: "chore: Development release"`: 생성될 commit 내용

        - `version: yarn changeset:version`: .changeset 폴더내 변경사항이 작성된 md 파일 존재시 실행될 명령어로 md 파일 기반으로 package.json의 version, CHANGELOG.md 업데이트하고 PR을 생성

        - `publish: yarn release`: 버전이 업데이트된 경우 실행될 명령어로 Github 릴리즈, 태그가 생성되고 Github repository에 추가, 성공시 outputs.published 값 "true" 반환

  - update-dev-brand jobs: main 브랜치의 version과 dev 브랜치의 version 동기화 작업

    - steps

      - `name: Checkout dev branch`: dev 브랜치의 최신 커밋을 체크아웃하고 이후 step들 또한 해당 환경에서 작업 수행

      - `name: Get release version`

        - `curl "https://,,,"`: URL에 HTTP 요청을 전송

        - `- H ",,,"`: 요청 헤더 설정

        - `jq -r .tag_name`: jq는 JSON 데이터를 처리하는 유틸리티이며, -r 플래그를 통해 문자열 형태로 반환하도록 하며, .tag_name은 JSON 객체에서 tag_name 필드를 추출

        - `if [-z "$version"]; then ,,, else ,,, fi`: -z 옵션을 통해 version 변수가 비어있는지 확인후 version 변수에 값 할당

        - `echo "VERSION=${version}" >> $GITHUB_ENV`: VERSION 환경변수에 version 값 할당

      - `name: Delete changeset markdown file`: .changeset 폴더 내 변경사항을 담고 있는 마크다운 파일 제거

      - `name: Update package.json version`

        - `jq --arg version "$VERSION"`: VERSION 환경 변수 값을 version 변수로 전달

        - `'.version = $version' package.json > tmp.json`: package.json의 version 필드 값을 앞에서 저장된 version 값으로 업데이트된 내용을 tmp.json 파일 생성하여 저장

        - `mv tmp.json package.json`: tmp.json 내용을 package.json에 덮어씌워 업데이트

      - `name: Create commit and push to dev branch`: 변경사항들을 commit 생성후 dev 브랜치에 push


```yml
name: production release

on:
  push:
    branches: [main]

jobs:
  release:

    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - name: Enable corepack
      - uses: actions/checkout@v4
      - run: corepack enable

      - name: Install Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: "yarn"

      - name: Install Dependencies
        run: yarn install

      - name: Create Release Pull Request
        id: changesets
        uses: changesets/action@v1
        with:
          title: "chore: Production release"
          commit: "chore: Production release"
          version: yarn changeset:version
          publish: yarn release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Configure AWS credentials
        if: steps.changesets.outputs.published == 'true'
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-2

      - name: Deploy
        if: steps.changesets.outputs.published == 'true'
        env:
          NEXT_PUBLIC_NODE_ENV: 'production'
        run: |
          yarn run deploy:prod

    outputs: 
      published: ${{ steps.changesets.outputs.published }}

  update-dev-branch:

    runs-on: ubuntu-latest
    needs: release
    permissions:
      contents: write
    if: needs.release.outputs.published == 'true'
    
    steps:
      - uses: actions/checkout@v4
        with:
          ref: dev

      - name: Get current release version
        run: |
          version=$(curl --silent -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}" -H "X-GitHub-Api-Version: 2022-11-28" "https://api.github.com/repos/${{ github.repository }}/releases/latest"| jq -r .tag_name)

          if [ -z "$version" ]; then
            version="0.0.0"
          else
            version="${version#v}"
          fi

          echo "VERSION=${version}" >> $GITHUB_ENV

      - name: Delete changeset markdown file
        run: |
          find .changeset -type f -name "${VERSION}.md" -delete

      - name: Update package.json version
        run: |
          jq --arg version "$VERSION" '.version = $version' package.json > tmp.json && mv tmp.json package.json

      - name: Create commit and push to dev branch
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore: Update package.json version to $VERSION"
          git push origin dev
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  notification:

    runs-on: ubuntu-latest
    needs: release
    if: always()

    steps:
      - name: Send Slack notification
        if: needs.release.outputs.published == 'true'
        uses: slackapi/slack-github-action@v1.26.0
        with:
          channel-id: "채널 ID"
          slack-message: "${{ github.repository }} 개발 배포 ${{ needs.release.result == 'success' &&  '✅ 성공' || '❌ 실패'}}"
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

## Monorepo

changeset의 경우 모노레포 환경에서도 상호의존하는 패키지들의 일관성을 유지 및 쉽게 배포 지원

### yarn berry with monorepo

yarn beryy의 경우 모노레포를 지원하며 모노레포를 사용하기 위해서 루트 경로의 package.json에 workspaces를 추가

```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

이후 프로젝트 루트에 packages 폴더 생성 후 packages 폴더 내 프로젝트들을 생성하면 packages 하위 모든 디렉토리들을 workspace로 인식

각 workspace에서 명령어 사용하려면 `yarn workspace 패키지이름` 형식으로 실행

### chanageset with monorepo

changeset은 각 패키지에 대한 버전과 배포를 따로 관리하는 것을 지원하며 변경사항 내용을 작성하는 .chnageset 폴더 내 마크다운 파일을 아래와 같이 작성

```markdown
---
"패키지 이름": patch | minor | major
---

CHANGELOG.md에 작성될 내용 작성
```

각 페키지의 package.json에 작성된 프로젝트 이름을 작성하면 해당 패키지에 대한 버전과 배포를 관리