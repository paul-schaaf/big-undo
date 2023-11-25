# big-undo

A [vscode extension](https://marketplace.visualstudio.com/items?itemName=PaulSchaaf.big-undo) for undoing changes that have been made in rapid succession. This can be especially useful when using VSCode with voice software such as talon.

## settings

 - `maximumSnapshotsSaved`: The maximum number of snapshots to save. Defaults to 10.

## talon

Example talon command:
```
app: vscode
-
big undo:
    user.run_rpc_command("big-undo.undo")
```