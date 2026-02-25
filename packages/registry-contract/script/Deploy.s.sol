// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/Registry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        Registry registry = new Registry();
        vm.stopBroadcast();

        console.log("Registry deployed at:", address(registry));
    }
}
