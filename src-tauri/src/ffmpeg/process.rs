use std::process::Command;

pub fn make(executable_name: &str, args: &[&str]) -> Command {
    let mut cmd = Command::new(executable_name);
    cmd.args(args);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    cmd
}
