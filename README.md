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