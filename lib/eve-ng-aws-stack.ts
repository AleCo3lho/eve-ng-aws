import * as cdk from "aws-cdk-lib";
import {
  AutoScalingGroup,
  BlockDeviceVolume,
} from "aws-cdk-lib/aws-autoscaling";
import {
  InstanceClass,
  InstanceSize,
  InstanceType,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
  UserData,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class EveNgAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "EveNGVpc", {
      maxAzs: 1,
      subnetConfiguration: [
        {
          name: "PublicSubNet",
          subnetType: SubnetType.PUBLIC,
        },
      ],
      natGateways: 0,
    });
    vpc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const s3 = new Bucket(this, "bucketWithImages");

    const userData = UserData.forLinux();
    userData.addCommands(
      `sudo -i\n`,
      `set -o xtrace\n`,
      `resize2fs /dev/sda1\n`,
      `sed -i -e "s/.*PermitRootLogin .*/PermitRootLogin yes/" /etc/ssh/sshd_config\n`,
      `sed -i -e "s/.*PasswordAuthentication .*/PasswordAuthentication yes/" /etc/ssh/sshd_config\n`,
      `service ssh restart\n`,
      `wget -O - http://www.eve-ng.net/jammy/eczema@ecze.com.gpg.key | gpg --dearmor -o /etc/apt/trusted.gpg.d/eve-ng.gpg\n`,
      `echo "deb [arch=amd64] http://www.eve-ng.net/jammy jammy main" > /etc/apt/sources.list.d/eve-ng.list\n`,
      `apt-get update\n`,
      `apt-get upgrade\n`,
      `apt-get -y install software-properties-common python3-pip\n`,
      `DEBIAN_FRONTEND=noninteractive apt-get -y install eve-ng\n`,
      `/opt/unetlab/wrappers/unl_wrapper -a fixpermissions\n`,
    );

    const securityGroup = new SecurityGroup(this, "EveNgSG", {
      vpc: vpc,
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic());
    securityGroup.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const asg = new AutoScalingGroup(this, "EveNGASG", {
      vpc: vpc,
      ssmSessionPermissions: true,
      securityGroup: securityGroup,
      desiredCapacity: 1,
      userData: userData,
      machineImage: MachineImage.genericLinux({
        "us-east-1": "ami-0a0e5d9c7acc336f1",
      }),
      blockDevices: [
        {
          deviceName: "/dev/sda1",
          volume: BlockDeviceVolume.ebs(100),
        },
      ],
      instanceType: InstanceType.of(InstanceClass.C5, InstanceSize.METAL),
      associatePublicIpAddress: true,
      spotPrice: "1.50",
    });
    asg.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    s3.grantReadWrite(asg.role);
  }
}
