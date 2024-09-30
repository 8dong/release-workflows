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
