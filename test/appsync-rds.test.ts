import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as AppsyncRds from '../lib/appsync-rds-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new AppsyncRds.AppsyncRdsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
