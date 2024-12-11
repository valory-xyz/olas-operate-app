exports.default = async function (configuration) {
    const SM_KEY_PAIR_ALIAS = process.env.SM_KEY_PAIR_ALIAS;
    if (configuration.path) {
        if (SM_KEY_PAIR_ALIAS) {
            console.log(`Sign ${configuration.path}`);
            require("child_process").execSync(
                `"C:\\Program Files\\DigiCert\\DigiCert One Signing Manager Tools\\smctl.exe" sign --keypair-alias=${SM_KEY_PAIR_ALIAS} --input "${String(configuration.path)}"`
            );
        } else {
            console.log(`SKIP SIGN ${configuration.path}. no env var SM_KEY_PAIR_ALIAS specified`);
        }
    }
};