import _ from 'lodash'
import { Readable, PassThrough } from 'stream'
import { mockClient } from 'aws-sdk-client-mock'
import { S3, PutObjectCommand } from '@aws-sdk/client-s3'
import { sdkStreamMixin } from '@smithy/util-stream'

export const mockedS3 = function (constructorParams) {
  console.log(
    'MOCKED aws-sdk.S3 constructor called',
    JSON.stringify(_.omit(constructorParams, 'accessKeyId', 'secretAccessKey'), null, 2)
  )

  const s3Mock = mockClient(S3)

  s3Mock.callsFake(input => {
    // When there is body, something is sent. Return generic Etag
    if (input.Body) {
      return { ETag: '1' }
    }
    // Return data that was uploaded previously by the same key (same filename)
    const commands = s3Mock.commandCalls(PutObjectCommand, { Key: input.Key })
    // If nothing has been put/uploaded, return empty stream
    if (commands.length === 0) {
      return Promise.resolve({ Body: sdkStreamMixin(new PassThrough().end()) })
    }
    const buffer = commands[0].args[0].input.Body
    return Promise.resolve({ Body: sdkStreamMixin(Readable.from(buffer)) })
  })
  return new S3(constructorParams)
}
