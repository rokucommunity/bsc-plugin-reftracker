import * as fsExtra from 'fs-extra';
import * as fastGlob from 'fast-glob';
import type { BscFile, CompilerPlugin, Editor, Program, XmlFile } from 'brighterscript';
import { AstEditor, createSGAttribute, isXmlFile, standardizePath as s, util } from 'brighterscript';
import { SGFunction, SGInterface, SGScript } from 'brighterscript/dist/parser/SGTypes';
const cwd = s`${__dirname}/../`;

export class Plugin implements CompilerPlugin {
	name = 'bsc-plugin-reftracker';

	afterProgramCreate(program: Program) {
		//inject the the required library files at the start of the program so they're available to all files from the very start
		const files = fastGlob
			.sync('**/*.{bs,brs,xml}', {
				absolute: false,
				cwd: s`${cwd}/lib`
			}).map(x => ({
				src: s`${cwd}/lib/${x}`,
				dest: x
			}));

		//add these to the program's files array so it works in lsp mode
		program.options.files.push(...files);

		for (const file of files) {
			program.setFile(file, fsExtra.readFileSync(file.src).toString());
		}
	}

	afterFileParse(file: BscFile) {
		if (isXmlFile(file)) {
			//inject the reftracker.bs file as a reference
			this.injectScriptAndCallfunc(file, new AstEditor());
		}
	}

	beforeProgramValidate(program: Program) {
		console.log('beforeProgramValidate');
	}

	// beforeFileTranspile(event: BeforeFileTranspileEvent) {
	// 	if (isBrsFile(event.file)) {

	// 	} else if (isXmlFile(event.file)) {
	// 		//inject the reftracker.bs file as a reference
	// 		this.injectScriptAndCallfunc(event.file, event.editor);
	// 	}
	// }

	private injectScriptAndCallfunc(file: XmlFile, editor: Editor) {
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
				{ text: 'function', range: util.createRange(0, 0, 0, 99) },
				[
					createSGAttribute('name', 'reftracker_internal_execute')
				]
			)
		);

		//inject the script
		editor.arrayPush(
			file.ast.component!.scripts,
			new SGScript(
				{ text: 'script', range: util.createRange(0, 0, 0, 99) },
				[
					createSGAttribute('type', 'text/brightscript'),
					createSGAttribute('uri', 'pkg:/source/reftrackerLib.bs')
				]
			)
		);
		// //for bsc v0, we also have to manipulate parser.references.scriptTagImports
		// editor.arrayPush(
		// 	file.parser.references.scriptTagImports,
		// 	{
		// 		pkgPath: s`source/reftrackerLib.bs`,
		// 		text: 'pkg:/source/reftrackerLib.bs',
		// 		filePathRange: util.createRange(0, 0, 0, 0)
		// 	}
		// );
	}
}
