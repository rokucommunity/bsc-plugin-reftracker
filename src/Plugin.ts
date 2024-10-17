import * as fsExtra from 'fs-extra';
import * as fastGlob from 'fast-glob';
import type { BeforeFileTranspileEvent, CompilerPlugin, Editor, Program, XmlFile } from 'brighterscript';
import { createSGAttribute, isBrsFile, isXmlFile, standardizePath as s } from 'brighterscript';
import { SGField, SGFunction, SGInterface, SGScript } from 'brighterscript/dist/parser/SGTypes';
const cwd = s`${__dirname}/../`;

export class Plugin implements CompilerPlugin {
	name = 'bsc-plugin-reftracker';

	afterProgramCreate(program: Program) {
		//inject the the required library files at the start of the program so they're available to all files from the very start
		const files = fastGlob.sync('**/*.{bs,brs,xml}', {
			absolute: false,
			cwd: s`${cwd}/lib`
		});
		for (const file of files) {
			program.setFile({
				src: s`${cwd}/lib/${file}`,
				dest: file
			}, fsExtra.readFileSync(s`${cwd}/lib/${file}`).toString());
		}
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

		//add the interface function
		editor.arrayPush(
			file.ast.component!.api.functions,
			new SGFunction(
				{ text: 'function' },
				[
					createSGAttribute('name', 'reftracker_internal_execute')
				]
			)
		);
		//add a new interface field indicating this function is available
		editor.arrayPush(
			file.ast.component!.api.fields,
			new SGField(
				{ text: 'field' },
				[
					createSGAttribute('id', 'reftrackerEnabled'),
					createSGAttribute('type', 'boolean'),
					createSGAttribute('value', 'true')
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
					createSGAttribute('uri', 'pkg:/source/reftrackerLib.bs')
				]
			)
		);
	}
}
