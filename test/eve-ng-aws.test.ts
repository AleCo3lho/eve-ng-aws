import * as cdk from "aws-cdk-lib";
import { EveNgAwsStack } from "../lib/eve-ng-aws-stack";
import { Template } from "aws-cdk-lib/assertions";

test("snapshot for EveNGStack matches previous state", () => {
  const app = new cdk.App();
  const stack = new EveNgAwsStack(app, "TestEveNGStack");

  const template = Template.fromStack(stack);

  expect(template.toJSON()).toMatchSnapshot();
});
