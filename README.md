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