import * as fsExtra from 'fs-extra';
import type { BeforeFileTranspileEvent, CompilerPlugin, Editor, Program, XmlFile } from 'brighterscript';
import { createSGAttribute, isBrsFile, isXmlFile, standardizePath as s } from 'brighterscript';
import { SGFunction, SGInterface, SGScript, SGTag } from 'brighterscript/dist/parser/SGTypes';
const libPath = s`${__dirname}/../lib/source/reftracker.bs`;

export class Plugin implements CompilerPlugin {
	name = 'bsc-plugin-reftracker';

	afterProgramCreate(program: Program) {
		//inject the library file at the start of the program so it's available to all files from the very start
		program.setFile({
			src: libPath,
			dest: 'source/reftracker.bs'
		}, fsExtra.readFileSync(libPath).toString());
	}

	beforeFileTranspile(event: BeforeFileTranspileEvent) {
		if (isBrsFile(event.file)) {

		} else if (isXmlFile(event.file)) {
			//inject the reftracker.bs file as a reference
			this.injectScriptAndCallfunc(event.file, event.editor);
		}
	}

	private injectScriptAndCallfunc(file: XmlFile, editor: Editor) {
		//inject the script tag
		if (!file.ast.component?.api) {
			file.ast.component!.api = new SGInterface();
		}
		if (!file.ast.component!.api.functions) {
			file.ast.component!.api.functions = [];
		}

		editor.arrayPush(
			file.ast.component!.api.functions,
			new SGFunction(
				{ text: 'function' },
				[
					createSGAttribute('name', 'reftracker_execute')
				]
			)
		);

		//inject the script
		editor.arrayPush(
			file.ast.component!.scripts,
			new SGScript(
				{ text: 'script' },
				[
					createSGAttribute('type', 'text/brightscript'),
					createSGAttribute('uri', 'pkg:/source/reftracker.bs')
				]
			)
		);
	}
}
