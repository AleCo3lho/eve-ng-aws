import * as cdk from "aws-cdk-lib";
import {
  AutoScalingGroup,
  BlockDeviceVolume,
} from "aws-cdk-lib/aws-autoscaling";
import {
  CfnKeyPair,
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
import { Construct } from "constructs";

export class EveNgAwsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const keyPair = new CfnKeyPair(this, "EveNGKeyPair", {
      keyName: "EveNGKeyPair",
      publicKeyMaterial:
        "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDSJwHY4iZRd9G5szIVmiypqlpcpOprzqnLzq5g+c55bdtTdEnc3fP+omR98Obolhx1MLVxoT5bS9C96id+28t/6JjutwGoVb61KUNaAwyMO1Q6PE5N0TZFCJf3sSerE+paYHPGzP1FsrvZ3W0xGhyuHsH2ukxVNw0af4b04x4uE7seV7qaDvpwMrwpIhQExof1xUfWbNlrsfdb2Z50iip72efEBBAeixiI6oZO6jYZGvTzRbXQYKLQ3zbNFakTjkb2WG/70uESljhConvmNmBjyh2ApFld+xFA8j8b4mCWZtGXvcM5Y1Gom36hirL22HPRphRFYu4sQOmIXAeGkaG3XQ7cnEilo8PBpqb3ByRpdPOrdp9sE2o04mSBVmPLQ4JATSh2Sw2rQw0Is6s9YSMl7jKwdQxZPLQ2XoW3Vdl+vIowqpeWv7vH5n3yhYwSOwnhUfGkqQeVsk+v53/S0e8+4S4aLAflSiLBc/wVeQCbkt/HdTNhSE01YhS8KIlSdRU= alexandrecoelho@Alexandres-MacBook-Pro.local",
    });
    keyPair.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

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
      `pip install gdown\n`,
      `gdown https://drive.google.com/drive/folders/1ORWpJOO-8B-tsQe95gnhEqzQ5vZl2CMm -O /root/eveng/os --folder\n`,
      `mv /root/eveng/os/image/* /opt/unetlab/addons/dynamips/\n`,
      `mv /root/eveng/os/qemu/* /opt/unetlab/addons/qemu/\n`,
      `mv /root/eveng/os/IOL/* /opt/unetlab/addons/iol/\n`,
      `cd /opt/unetlab/addons/iol/\n`,
      `cat *.tar.gz | tar zxvf - -i\n`,
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
      spotPrice: "1.30",
      keyName: keyPair.keyName,
    });
    asg.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
  }
}
