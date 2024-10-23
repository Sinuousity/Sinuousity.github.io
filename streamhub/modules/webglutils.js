export class GLUtils
{
	static program_vs_core = `#version 300 es
	in vec4 position;
	out vec4 o_position;
	out vec2 texcoord;
	
	void main()
	{
		o_position = position;
		texcoord = position.xy * 0.5 + 0.5;
	}
	`;

	static program_fs_core = `#version 300 es
	precision mediump float;

	uniform sampler2D maintex;
	uniform vec4 color;

	in vec2 texcoord;
	out vec4 fragColor;
	
	void main()
	{
		if( texcoord.x < 0.5 ) discard;
		fragColor = color;// * texture(maintex, texcoord);
	}
	`;

	static vertex_list_quad = new Float32Array(
		[
			-1, -1,
			-1, +1,
			+1, -1,
			+1, -1,
			-1, +1,
			+1, +1,
		]
	);

	static CreateProgram(gl, program_vs = program_vs_core, program_fs = program_fs_core, andUse = true)
	{
		let result = gl.createProgram();

		let shader_vs = GLUtils.CompileShader(gl, gl.VERTEX_SHADER, program_vs);
		let shader_fs = GLUtils.CompileShader(gl, gl.FRAGMENT_SHADER, program_fs);

		gl.attachShader(result, shader_vs);
		gl.attachShader(result, shader_fs);
		gl.linkProgram(result);

		if (gl.getProgramParameter(result, gl.LINK_STATUS))
		{
			if (andUse) gl.useProgram(result);
			return result;
		}
		else
		{
			console.warn('GL Program Creation Failed! ' + gl.getProgramInfoLog(result));
			gl.deleteProgram(result);
			return null;
		}
	}

	static CompileShader(gl, shader_type, shader_source = '')
	{
		let result = gl.createShader(shader_type);
		gl.shaderSource(result, shader_source);
		gl.compileShader(result);
		if (gl.getShaderParameter(result, gl.COMPILE_STATUS))
		{
			return result;
		}
		else 
		{
			console.warn('Shader Compilation Failed! ' + gl.getShaderInfoLog(result));
			gl.deleteShader(result);
			return null;
		}
	}




	static CreateWebGLTexture(gl, width = 32, height = 32, tuIndex = 0)
	{
		if (!gl) return null;

		// create texture
		const result = gl.createTexture();
		gl.activeTexture(gl.TEXTURE0 + tuIndex);
		gl.bindTexture(gl.TEXTURE_2D, result);

		// set size and format
		const level = 0;
		const internalFormat = gl.RGBA;
		const border = 0;
		const format = gl.RGBA;
		const type = gl.UNSIGNED_BYTE;
		const data = null;
		gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, format, type, data);

		// set filtermode
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		return result;
	}

	static CreateFrameBufferTexture2D(gl, width = 32, height = 32, tuIndex = 0)
	{
		if (!gl) return null;

		let result =
		{
			texture: null,
			framebuffer: null,
		};

		result.texture = GLUtils.CreateWebGLTexture(gl, width, height, tuIndex);
		result.framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, result.framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, result.texture, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		return result;
	}



	static SetVertexAttributeArray(gl, program, data_size = 1, data_type = gl.FLOAT, datum = [])
	{
		let ulocation = gl.getAttribLocation(program, 'position');

		let data_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, data_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, datum, gl.STATIC_DRAW);

		let vao = gl.createVertexArray();
		gl.bindVertexArray(vao);
		gl.enableVertexAttribArray(ulocation);
		gl.vertexAttribPointer(ulocation, data_size, data_type, false, 0, 0);

		return { ulocation: ulocation, buffer: data_buffer, vao: vao };
	}




	static GetULocation(gl, program, property_name = 'color') { return gl.getUniformLocation(program, property_name); }
	static SetColorParam(gl, ulocation, color = [1, 1, 1, 1]) { gl.uniform4fv(ulocation, color); }
	static SetVec4Param(gl, ulocation, vec4 = [1, 1, 1, 1]) { gl.uniform4fv(ulocation, vec4); }
	static SetTUForTextureParam(gl, ulocation, tuIndex) { gl.uniform1i(ulocation, tuIndex); }


	static ClearColor(gl, r = 0, g = 0, b = 0, a = 0)
	{
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.clearColor(r, g, b, a);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	static ClearColorDepth(gl, r = 0, g = 0, b = 0, a = 0)
	{
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.clearColor(r, g, b, a);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
}