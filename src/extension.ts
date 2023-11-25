import {
    commands,
    ExtensionContext,
    Range,
    Position,
    TextEditor,
    window,
    workspace,
    WorkspaceEdit
} from "vscode";

export function activate(context: ExtensionContext) {
    let snapshots: string[] = [];
    let activeEditor: TextEditor | undefined = undefined;
    let lastSaved: String | null = null;
    let config = workspace.getConfiguration("big-undo");

    const debounce = (
        func: { (): void; apply?: any },
        timeout: number | undefined
    ) => {
        let timer: string | number | NodeJS.Timeout | undefined;
        return (...args: any) => {
            if (timer) {
                clearTimeout(timer);
            }
            timer = setTimeout(() => func.apply(null, args), timeout);
        };
    };

    // use only the last snapshot of a series of rapid edits
    const editHandling = debounce(() => {
        addSnapshot(activeEditor);
    }, 1000);

    const addSnapshot = (editor: TextEditor | undefined) => {
        if (editor) {
            const currentText = editor.document.getText();
            if (currentText !== lastSaved) {
                snapshots.push(currentText);
                // @ts-expect-error
                if (snapshots.length > config.get("maximumSnapshotsSaved")) {
                    snapshots.shift();
                }
                lastSaved = currentText;
            }
        }
    };

    activeEditor = window.activeTextEditor;
    if (activeEditor) {
        snapshots = [];
        addSnapshot(activeEditor);
    }

    workspace.onDidChangeTextDocument((event) => {
        if (activeEditor && event.document.uri === activeEditor.document.uri) {
            editHandling();
        }
    });

    window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            activeEditor = editor;
            snapshots = [];
            addSnapshot(activeEditor);
        }
    });

    workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("big-undo")) {
            config = workspace.getConfiguration("big-undo");
        }
    });

    const disposableUndo = commands.registerCommand(
        "big-undo.undo",
        async () => {
            const editor = window.activeTextEditor;
            if (editor && activeEditor === editor) {
                if (snapshots.length === 1) {
                    // we always need to have one snapshot that we can return to so we cannot remove the first one
                    return;
                }
                snapshots.pop();
                const lastSnapshot = snapshots.pop();
                if (lastSnapshot === undefined) {
                    return;
                }
                const document = editor.document;
                const edit = new WorkspaceEdit();

                edit.replace(
                    document.uri,
                    new Range(
                        new Position(0, 0),
                        new Position(document.lineCount + 1, 0)
                    ),
                    lastSnapshot
                );
                await workspace.applyEdit(edit);
            }
        }
    );

    context.subscriptions.push(disposableUndo);
}

export function deactivate() {}
