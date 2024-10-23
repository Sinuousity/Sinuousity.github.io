import { addElement } from "../hubscript.js";
import { AnimJob } from "./AnimJob.js";
import { ChatCollector } from "./chatcollector.js";
import { EventSource } from "./eventsource.js";
import { GlobalTooltip } from "./globaltooltip.js";
import { Rewards } from "./rewards.js";
import { DraggableWindow } from "./windowcore.js";
import { WindowManager } from "./windowmanager.js";

console.info("[ +Module ] Community Feud Window");


class CommunityFeudAnswerPanel
{
	constructor(e_parent, id)
	{
		this.id = id;

		this.pinned = false;
		this.revealed = false;
		this.answer = '';
		this.count = 0;

		this.e_panel = addElement(
			'div', null, e_parent, null,
			x =>
			{
				x.style.position = 'relative';
				x.style.height = '2.4rem';
				x.style.margin = '0.75rem 0.75rem 0rem 0.75rem';

				x.style.cursor = 'pointer';

				x.style.overflow = 'visible';
				x.style.textOverflow = 'truncate';
				x.style.borderRadius = '0.02rem';

				x.style.fontSize = '1.6rem';
				x.style.lineHeight = '2.4rem';
				x.style.letterSpacing = '0.15rem';
				x.style.textShadow = 'black 3px 3px 2px';
				x.style.textAlign = 'center';

				x.style.opacity = '0.8';

				x.style.transitionProperty = 'opacity, outline, outline-offset';
				x.style.transitionDuration = '0.2s';
				x.style.transitionTimingFunction = 'ease-in-out';
			}
		);

		this.e_infos = addElement(
			'div', null, this.e_panel, null,
			x =>
			{
				x.style.position = 'absolute';
				x.style.inset = '0';

				x.style.outlineOffset = '2px';
				x.style.outline = 'solid skyblue 2px';
				x.style.borderRadius = '0.05rem';

				x.style.transform = 'rotate3d(1, 0, 0, 180deg)';

				x.style.transitionProperty = 'transform';
				x.style.transitionDuration = '0.333s';
				x.style.transitionTimingFunction = 'ease';
			}
		);

		this.e_panel_back = addElement(
			'div', null, this.e_infos, null,
			x =>
			{
				x.style.position = 'absolute';
				x.style.inset = '0';

				x.style.outline = 'solid skyblue 1px';
				x.style.borderRadius = '0.05rem';
				x.style.height = '2.4rem';
				x.style.backgroundBlendMode = 'multiply';
				x.style.backgroundColor = 'white';
				x.style.background = 'linear-gradient(0deg, lightblue -50%, blue 200%), linear-gradient(180deg, #0005 20%, transparent 50%)';
			}
		);

		this.e_answer_lbl = addElement(
			'div', null, this.e_infos, 'A TEST ANSWER',
			x =>
			{
				x.style.position = 'absolute';
				x.style.inset = '0 2.4rem 0 0';
				x.style.borderRadius = '0.2rem';
				x.style.paddingLeft = '0.5rem';
				x.style.paddingRight = '0.5rem';

				x.style.backgroundColor = '#004a';

				x.style.textWrap = 'nowrap';
				x.style.wordWrap = 'break-word';
				x.style.overflow = 'hidden';
				x.style.textOverflow = 'ellipsis';

				x.style.opacity = '0.0';

				x.style.transitionProperty = 'opacity';
				x.style.transitionDelay = '0s';
				x.style.transitionDuration = '0.125s';
				x.style.transitionTimingFunction = 'ease-in-out';
			}
		);

		this.e_count_lbl = addElement(
			'div', null, this.e_infos, '13',
			x =>
			{
				x.style.justifyContent = 'center';
				x.style.position = 'absolute';
				x.style.fontSize = '1.3rem';
				x.style.width = '2.4rem';
				x.style.top = '0';
				x.style.bottom = '0';
				x.style.right = '0';
				x.style.letterSpacing = '0.02rem';
				x.style.borderRadius = '0.5rem';

				x.style.opacity = '0.0';

				x.style.transitionProperty = 'opacity';
				x.style.transitionDuration = '0.125s';
				x.style.transitionTimingFunction = 'ease-in-out';
			}
		);

		this.e_count_lbl_back = addElement(
			'div', null, this.e_infos, '13',
			x =>
			{
				x.style.justifyContent = 'center';
				x.style.position = 'absolute';
				x.style.fontSize = '1.3rem';
				x.style.width = '2.4rem';
				x.style.top = '0';
				x.style.bottom = '0';
				x.style.right = '0';
				x.style.borderRadius = '0.5rem';
				x.style.letterSpacing = '0.02rem';

				x.style.opacity = '0.5';
				x.style.transform = 'rotate3d(1, 0, 0, 180deg)';

				x.style.transitionProperty = 'opacity';
				x.style.transitionDuration = '0.125s';
				x.style.transitionTimingFunction = 'ease-in-out';
			}
		);


		// mouse events
		this.e_panel.addEventListener('click', e => this.TogglePinned());
		this.e_panel.addEventListener(
			'mouseenter',
			e =>
			{
				if (this.count > 0) 
				{
					this.e_panel.style.opacity = '1.0';
					this.e_panel.style.outline = 'solid white 2px';
					this.e_panel.style.outlineOffset = '8px';
				}
			}
		);
		this.e_panel.addEventListener(
			'mouseleave',
			e => 
			{
				this.e_panel.style.opacity = '0.8';
				this.e_panel.style.outline = 'solid #fff0 2px';
				this.e_panel.style.outlineOffset = '0px';
			}
		);
	}

	TogglePinned()
	{
		if (typeof this.answer !== 'string') return;
		if (this.answer === '') return;
		if (this.count < 1) return;
		this.pinned = !this.pinned;
		if (this.pinned) this.Reveal(); else this.Hide();
	}

	ReleasePin()
	{
		if (!this.pinned) return;
		this.pinned = false;
		this.Hide();
	}

	Reveal()
	{
		if (this.revealed) return;
		this.revealed = true;

		CommunityFeudWindow.event_AnswerRevealed.Invoke();

		this.e_infos.style.transform = 'rotate3d(1, 0, 0, 0deg)';
		this.e_answer_lbl.style.opacity = '1.0';
		this.e_count_lbl.style.opacity = '1.0';
		this.e_count_lbl_back.style.opacity = '0.0';
		this.e_answer_lbl.style.transitionDelay = '0.1s';
	}

	Hide()
	{
		if (this.pinned) return;
		if (!this.revealed) return;
		this.revealed = false;

		CommunityFeudWindow.event_AnswerHidden.Invoke();

		this.e_infos.style.transform = 'rotate3d(1, 0, 0, 180deg)';
		this.e_answer_lbl.style.opacity = '0.0';
		this.e_count_lbl.style.opacity = '0.0';
		this.e_count_lbl_back.style.opacity = '0.5';
		this.e_answer_lbl.style.transitionDelay = '0s';
	}

	SetAnswer(answer)
	{
		this.answer = answer;
		this.e_answer_lbl.innerText = answer;
	}
	SetCount(count = 1)
	{
		this.count = count;

		if (this.count < 1)
		{
			this.e_count_lbl.innerText = '';
			this.e_count_lbl_back.innerText = '';
			this.e_panel.style.cursor = 'default';
		}
		else
		{
			this.e_count_lbl.innerText = count;
			this.e_count_lbl_back.innerText = count;
			this.e_panel.style.cursor = 'pointer';
		}
	}
}

const default_feud_prompt = 'Type a question...';
const default_feud_questions = [
	'A good place to cry.',
	'A type of insurance.',
	'Something you shred.',
	'Something you wish for.',
	'Something you take out.',
	'Something you decorate.',
	'Something that has teeth.',
	'A type of bird people eat.',
	'Something you might hang up.',
	'A type of food that you lick.',
	'Something thrillseekers ride.',
	'An occasion you dress up for.',
	'Something you do every night.',
	'Something that has a long neck.',
	'Something that might be spoiled.',
	'Something that might be brewing.',
	'Something you might fall out of.',
	'Something that is full of holes.',
	'Something an athlete might break.',
	'Something that might be a dead end.',
	'Something you might do once a week.',
	'A nickname the Baker gives his wife.',
	'Something you might deliver as a job.',
	'Something you might keep in a cellar.',
	'Something you might win on a gameshow.',
	'A profession that involves getting wet.',
	'Something you might try to squeeze into.',
	'Something you might keep in the freezer.',
	'Something you might receive in the mail.',
	'Something you might see your neighbor doing.',
	'Something someone might make fun of you for.',
	'Something you keep in your car, just in case.',
	'Something you might forget when you leave home.',
	'Something in your closet for special occasions.',
	'Something that grows faster than you want it to.',
	'Something that grows slower than you want it to.',
	'Something you keep in your wallet, just in case.',
	'Something you should not be holding when driving.',
	'Something you would not want to see on your shoe.',
	'Something you might be glad only comes once a year.',

	'A type of snack.', //chips, nuts, popcorn, candy
	'Something you put on a sandwich.', //lettuce, mayo, cheese, mustard
	'Something you drink in the morning.', //coffee, juice, tea, water
	'A place where you need to be quiet.', //library, church, hospital, theater
	'Something you wear in the winter.', //coat, gloves, scarf, boots
	'Something you associate with Halloween.', //candy, pumpkins, ghosts, costumes
	'Something that can be inflated.', //balloon, tire, raft, beach ball
	'Something you do when you’re bored.', //read, watch TV, sleep, scroll
	'A reason people are late to work.', //traffic, alarm, kids, weather
	'Something that gets delivered to your house.', //package, pizza, mail, groceries
	'A tool you might use in the kitchen.', //knife, whisk, spatula, spoon
	'Something you see in the sky at night.', //stars, moon, plane, satellite
	'A reason you might skip dessert.', //full, diet, no time, sugar
	'Something people wear to the beach.', //swimsuit, hat, sunglasses, flip-flops
	'Something that makes noise at night.', //crickets, wind, train, dog
	'A part of the body you can injure.', //knee, ankle, back, wrist
	'Something you eat with soup.', //bread, crackers, spoon, salad
	'Something you put in a suitcase.', //clothes, shoes, toothbrush, charger
	'Something you find on a breakfast table.', //cereal, milk, toast, coffee
	'A reason people might cancel plans.', //sick, busy, weather, tired
	'Something that needs to be charged.', //phone, laptop, car, tablet
	'Something you might lock.', //door, car, safe, bike
	'A type of dessert people bake.', //cake, pie, brownies, cookies
	'Something you clean with.', //sponge, soap, broom, cloth
	'Something people do when they’re nervous.', //sweat, shake, bite nails, pace
	'Something you might borrow.', //money, clothes, car, book
	'Something that lights up.', //lamp, candle, flashlight, phone
	'Something that comes in a can.', //soup, soda, beans, paint
	'A reason you might get a ticket.', //speeding, parking, texting, expired tag
	'Something that melts.', //ice, butter, chocolate, snow
	'Something that gets tangled.', //hair, rope, string, wires
	'Something that gets stuck.', //gum, zipper, ring, drawer
	'Something that gets cut.', //hair, grass, paper, nails
	'Something that goes up and down.', //elevator, seesaw, blinds, rollercoaster
	'Something that needs to be washed.', //clothes, car, dishes, windows
	'Something people are allergic to.', //pollen, peanuts, dust, cats
	'A reason people turn on the TV.', //news, sports, weather, movie
	'Something that needs to be sharpened.', //pencil, knife, skates, scissors
	'Something you keep in a garage.', //car, tools, bike, lawnmower
	'Something you see in a hospital.', //nurse, bed, medicine, doctor
	'A reason people go to the doctor.', //pain, cold, check-up, injury
	'Something you might recycle.', //paper, plastic, cans, glass
	'Something people grow in a garden.', //tomatoes, flowers, herbs, carrots
	'Something people play outside.', //soccer, basketball, frisbee, tag
	'A type of shoe you tie.', //sneaker, boot, cleat, skate
	'Something that wakes you up.', //alarm, baby, noise, light
	'Something you can fold.', //paper, laundry, napkin, blanket
];

export class CommunityFeudWindow extends DraggableWindow
{
	static window_kind = "Community Feud";
	static window_title = "Community Feud";
	static window_icon = 'groups_3';//'maps_ugc';
	//static window_icon = 'quickreply';
	static instance = null;

	static answers = [];
	static event_AnswersChanged = new EventSource();
	static event_AnswerRevealed = new EventSource();
	static event_AnswerHidden = new EventSource();

	static ClearAnswers()
	{
		CommunityFeudWindow.answers = [];
	}

	static TryRegisterAnswer(username = '', answer = '')
	{
		let answers = CommunityFeudWindow.answers;

		if (typeof username !== 'string' || typeof answer !== 'string') return;

		username = username.trim();
		answer = answer.trim();

		if (username === '' || answer === '') return;

		let existingAnswerIndex = answers.findIndex(x => x.answer === answer);
		if (existingAnswerIndex < 0) // no existing answer
		{
			const max_answers = 100;
			let answer_count = CommunityFeudWindow.answers.length;
			if (answer_count >= max_answers) CommunityFeudWindow.answers.splice(max_answers, answer_count - max_answers);
			CommunityFeudWindow.answers.push({ answer: answer, users: [username] });
		}
		else
		{
			let existingUsernameIndex = CommunityFeudWindow.answers[existingAnswerIndex].users.indexOf(username);
			if (existingUsernameIndex > -1) return; // found existing user under answer
			CommunityFeudWindow.answers[existingAnswerIndex].users.push(username);
			CommunityFeudWindow.answers.sort((a, b) => b.users.length - a.users.length);
		}

		CommunityFeudWindow.event_AnswersChanged.Invoke();
	}

	constructor(pos_x, pos_y)
	{
		super(CommunityFeudWindow.window_title, pos_x, pos_y);

		this.e_window_root.style.minHeight = "37rem";
		this.e_window_root.style.minWidth = "22rem";

		this.SetTitle(CommunityFeudWindow.window_title);
		this.SetIcon(CommunityFeudWindow.window_icon);
		this.window_kind = CommunityFeudWindow.window_kind;
		this.CreateContentContainer();

		this.CreateWindowBackground();

		this.e_foreground_root = addElement('div', null, this.e_content);
		this.e_foreground_root.style.position = 'absolute';
		this.e_foreground_root.style.overflowX = 'hidden';
		this.e_foreground_root.style.overflowY = 'auto';
		this.e_foreground_root.style.inset = '0';

		this.CreateAnswerArea();
		this.CreateQuestionBlock();

		if (!CommunityFeudWindow.audiosrc_ding)
			CommunityFeudWindow.audiosrc_ding = addElement(
				'audio', null, this.e_window_root, null,
				x =>
				{
					x.preservesPitch = false;
					x.src = './files/audio/320905__suzenako__the-ding.wav';
				}
			);

		if (!CommunityFeudWindow.audiosrc_flip)
			CommunityFeudWindow.audiosrc_flip = addElement(
				'audio', null, this.e_window_root, null,
				x =>
				{
					x.preservesPitch = false;
					x.src = './files/audio/KEMP8_SET1_55_DAMPENED_RR3.wav';
				}
			);

	}

	anim_BackgroundSlide(dt = 0.0)
	{
		this.background_slide_x += 0.34567 * dt;
		this.background_slide_y += 0.23456 * dt;
		if (this.background_slide_x > 1.0) this.background_slide_x -= 1.0;
		if (this.background_slide_y > 1.0) this.background_slide_y -= 1.0;

		this.e_background_lights_01.style.backgroundPositionX = (this.background_slide_x * 4.0) + 'rem';
		this.e_background_lights_02.style.backgroundPositionX = (-this.background_slide_x * 7.0) + 'rem';

		//this.e_background_lights_01.style.backgroundPositionY = (this.background_slide_y * 4.0) + 'rem';
		this.e_background_lights_02.style.backgroundPositionY = (-this.background_slide_y * 7.0) + 'rem';
	}

	CreateWindowBackground()
	{
		this.e_background_root = addElement('div', null, this.e_content);
		this.e_background_root.style.position = 'absolute';
		this.e_background_root.style.inset = '0';

		this.e_background_far = addElement('div', null, this.e_background_root);
		this.e_background_far.style.position = "absolute";
		this.e_background_far.style.zIndex = '-110';
		this.e_background_far.style.height = "100%";
		this.e_background_far.style.width = "100%";
		this.e_background_far.style.backgroundColor = "#f0a51f";

		this.e_background_lights_01 = this.NewBackgroundLightsElement(4, 3);
		this.e_background_lights_02 = this.NewBackgroundLightsElement(7, 3);

		this.e_background_near = addElement('div', null, this.e_background_root);
		this.e_background_near.style.position = "absolute";
		this.e_background_near.style.zIndex = '-90';
		this.e_background_near.style.height = "100%";
		this.e_background_near.style.width = "100%";
		this.e_background_near.style.mixBlendMode = "color-burn";
		this.e_background_near.style.background = "radial-gradient(#fff, #fff, #eee, #aaa, #00f)";
		this.e_background_near.style.opacity = '0.5';

		this.background_slide_x = 0.0;
		this.background_slide_y = 0.0;
		this.background_animation = new AnimJob(window.targetFrameDeltaMs, dt => this.anim_BackgroundSlide(dt));
		this.background_animation.Start();
	}

	NewBackgroundLightsElement(size = 4, visibility = 3)
	{
		let e = addElement('div', null, this.e_content);
		e.style.zIndex = '-100';
		e.style.position = "absolute";
		e.style.height = "100%";
		e.style.width = "100%";
		e.style.mixBlendMode = "screen";
		e.style.background = `radial-gradient(${size / 2}rem, #fff${visibility}, #fff0)`;
		e.style.backgroundSize = `${size}rem ${size}rem`;
		return e;
	}


	CreateAnswerArea()
	{
		this.e_answer_block = addElement(
			'div', null, this.e_foreground_root, null,
			x => 
			{
				x.style.position = 'relative';
				x.style.width = '100%';
				x.style.height = '27.25rem';
			}
		);

		this.e_answer_area = addElement(
			'div', null, this.e_answer_block, null,
			x =>
			{
				x.style.position = 'absolute';

				x.style.display = 'flex';
				x.style.flexDirection = 'column';
				x.style.justifyContent = 'space-evenly';

				x.style.paddingBottom = '0.7rem';

				x.style.borderRadius = '0.5rem';
				x.style.left = '1rem';
				x.style.top = '1rem';
				x.style.width = 'calc(100% - 2rem)';
				x.style.height = 'calc(100% - 2rem)';

				x.style.backgroundColor = 'black';

				x.style.lineHeight = '2.4rem';
				x.style.color = 'white';

				x.style.perspective = '800px';
			}
		);

		this.answerPanels = [];
		let answerCount = 8;
		for (let ii = 0; ii < answerCount; ii++)
		{
			let panel = new CommunityFeudAnswerPanel(this.e_answer_area, ii);
			this.answerPanels.push(panel);
		}

		this.UpdateAnswerPanels();

		addElement(
			'div', null, this.e_foreground_root, 'Clear Answers',
			x => 
			{
				x.style.position = 'relative';
				x.style.left = '50%';
				x.style.transform = 'translate(-50%,0)';
				x.style.width = 'fit-content';
				x.style.borderRadius = '1rem';
				x.style.paddingLeft = '1rem';
				x.style.paddingRight = '1rem';
				x.style.textAlign = 'center';
				x.style.lineHeight = '1.3rem';
				x.style.fontSize = '0.8rem';
				x.style.height = '1.3rem';
				x.style.letterSpacing = '0.08rem';
				x.style.textShadow = '#0003 0.05rem 0.05rem 0.1rem';
				x.style.backgroundColor = 'transparent';
				x.style.color = 'darkred';
				x.style.cursor = 'pointer';

				x.style.border = 'solid 2px transparent';

				x.style.transitionProperty = 'background-color, color, box-shadow, text-shadow, border';
				x.style.transitionDuration = '0.1s';
				x.style.transitionTimingFunction = 'ease-out';

				x.addEventListener(
					'mouseenter',
					e =>
					{
						this.clearingAnswers = false;
						x.style.color = 'white';
						x.style.backgroundColor = 'darkred';
						x.style.boxShadow = '#0008 -0.15rem 0.15rem 0.2rem';
						x.style.textShadow = '#000f 0.05rem 0.05rem 0.1rem';
						x.style.border = 'solid 2px red';
					}
				);
				x.addEventListener(
					'mouseleave',
					e =>
					{
						this.clearingAnswers = false;
						x.style.color = 'darkred';
						x.style.backgroundColor = 'transparent';
						x.style.boxShadow = 'none';
						x.style.textShadow = '#0005 0.05rem 0.05rem 0.1rem';
						x.style.border = 'solid 2px transparent';
					}
				);
				x.addEventListener(
					'mousedown',
					e =>
					{
						this.clearingAnswers = true;
						x.style.color = 'darkred';
						x.style.backgroundColor = 'red';
						x.style.boxShadow = '#0008 -0.15rem 0.15rem 0.2rem';
						x.style.textShadow = '#000f 0.05rem 0.05rem 0.1rem';
						x.style.border = 'solid 2px darkred';
					}
				);
				x.addEventListener(
					'mouseup',
					e =>
					{
						x.style.color = 'white';
						x.style.backgroundColor = 'darkred';
						x.style.boxShadow = '#0008 -0.15rem 0.15rem 0.2rem';
						x.style.textShadow = '#000f 0.05rem 0.05rem 0.1rem';
						x.style.border = 'solid 2px red';

						if (this.clearingAnswers === true)
						{
							CommunityFeudWindow.ClearAnswers();
							this.HideAllAnswerPanels();
							this.UpdateAnswerPanels();
							this.clearingAnswers = false;
						}
					}
				);
			}
		);
	}


	CreateQuestionBlock()
	{
		//spacer
		//addElement('div', null, this.e_foreground_root, null, x => { x.style.height = '1rem'; });

		this.e_question_randomize = addElement(
			'i', 'window-icon', this.e_foreground_root, 'casino',
			x =>
			{
				x.style.display = 'block';
				x.style.position = 'relative';
				x.style.left = '50%';
				x.style.transform = 'translate(-50%,0)';
				x.style.width = '1.5rem';
				x.style.pointerEvents = 'all';
				x.style.fontFamily = 'Material Icons';
				x.style.color = 'white';
				x.style.opacity = '0.25';
				x.style.lineHeight = '1.5rem';
				x.style.height = '1.5rem';
				x.style.fontSize = '1.5rem';
				x.style.cursor = 'pointer';
				x.style.zIndex = '1000000';
				x.style.textShadow = '#000 2px 2px 1px';

				x.style.transitionProperty = 'transform, opacity';
				x.style.transitionDuration = '0.1s';
				x.style.transitionTimingFunction = 'ease';

				x.addEventListener(
					'mousedown',
					e => 
					{
						x.style.opacity = '1.0';
						x.style.transform = 'translate(-50%,0) scale(115%) rotateZ(11deg)';
					}
				);
				x.addEventListener(
					'mouseup', e =>
				{
					x.style.opacity = '0.8';
					this.e_question_block.innerText = default_feud_questions[Math.round(Math.random() * (default_feud_questions.length - 1))];
					x.style.transform = 'translate(-50%,0) scale(120%) rotateZ(2deg)';
					this.OnQuestionEditComplete();
				});
				x.addEventListener(
					'mouseenter',
					e =>
					{
						x.style.opacity = '0.8';
						x.style.transform = 'translate(-50%,0) scale(120%) rotateZ(2deg)';
					}
				);
				x.addEventListener(
					'mouseleave',
					e => 
					{
						x.style.opacity = '0.25';
						x.style.transform = 'translate(-50%,0) scale(100%) rotateZ(0deg)';
					}
				);

				GlobalTooltip.RegisterReceiver(x, 'Randomize Prompt', `Use one of ${default_feud_questions.length} predefined prompts`);
			}
		);

		this.e_question_block = addElement(
			'div', null, this.e_foreground_root, default_feud_prompt,
			x => 
			{
				x.contentEditable = true;
				x.style.position = 'relative';
				x.style.cursor = 'text';
				x.style.left = '0.75rem';
				x.style.width = 'calc(100% - 2.5rem)';
				x.style.minHeight = '2rem';
				x.style.height = 'fit-content';
				x.style.overflow = 'visible';
				x.style.backgroundColor = 'transparent';
				x.style.wordWrap = 'break-word';
				x.style.textWrap = 'pretty';
				x.style.padding = '0.5rem';
				x.style.fontSize = '1.6rem';
				x.style.letterSpacing = '0.05rem';
				x.style.color = '#fff';
				x.style.opacity = '0.25';
				x.style.textShadow = 'black 2px 2px 2px';
				x.style.textAlign = 'center';
			}
		);

		//spacer
		addElement('div', null, this.e_foreground_root, null, x => { x.style.height = '1rem'; });

		this.e_question_block.addEventListener('focus', e => this.OnQuestionEdit());
		this.e_question_block.addEventListener('blur', e => this.OnQuestionEditComplete());
	}

	OnQuestionEdit()
	{
		this.e_question_block.style.opacity = '1.0';
		if (this.e_question_block.innerText === default_feud_prompt)
			this.e_question_block.innerText = '';
	}

	OnQuestionEditComplete()
	{
		let sel = window.getSelection();
		sel.removeAllRanges();

		if (this.e_question_block.innerText === '')
		{
			this.e_question_block.style.opacity = '0.25';
			this.e_question_block.innerText = default_feud_prompt;
		}
		else
		{
			this.e_question_block.style.opacity = '1.0';
		}
	}

	UpdateAnswerPanels()
	{
		if (this.answerPanels.length < 1) return;

		for (let ii = 0; ii < this.answerPanels.length; ii++)
		{
			let answerRef = CommunityFeudWindow.answers.length <= ii ? undefined : CommunityFeudWindow.answers[ii];
			let panel = this.answerPanels[ii];
			panel.SetAnswer(answerRef ? answerRef.answer : '');
			panel.SetCount(answerRef ? answerRef.users.length : 0);
		}
	}

	HideAllAnswerPanels()
	{
		if (this.answerPanels.length < 1) return;

		for (let ii = 0; ii < this.answerPanels.length; ii++)
		{
			this.answerPanels[ii].ReleasePin();
		}
	}

	CheckChatMessage(msg)
	{
		var answer = msg.message.toLowerCase().trim();
		CommunityFeudWindow.TryRegisterAnswer(msg.username, answer);
	}

	InitAudio()
	{
		if (!CommunityFeudWindow.audioContext)
			CommunityFeudWindow.audioContext = new window.AudioContext();

		if (CommunityFeudWindow.audioContext.state === 'suspended')
			CommunityFeudWindow.audioContext.resume();

		if (!CommunityFeudWindow.gainNode)
		{
			CommunityFeudWindow.gainNode = CommunityFeudWindow.audioContext.createGain();
		}

		if (!CommunityFeudWindow.audioTrack_ding) 
		{
			CommunityFeudWindow.audioTrack_ding = CommunityFeudWindow.audioContext.createMediaElementSource(CommunityFeudWindow.audiosrc_ding);
			CommunityFeudWindow.audioTrack_ding.connect(CommunityFeudWindow.gainNode).connect(CommunityFeudWindow.audioContext.destination);
		}

		if (!CommunityFeudWindow.audioTrack_flip) 
		{
			CommunityFeudWindow.audioTrack_flip = CommunityFeudWindow.audioContext.createMediaElementSource(CommunityFeudWindow.audiosrc_flip);
			CommunityFeudWindow.audioTrack_flip.connect(CommunityFeudWindow.gainNode).connect(CommunityFeudWindow.audioContext.destination);
		}
	}

	PlayFlip()
	{
		if (CommunityFeudWindow.audiosrc_flip)
		{
			CommunityFeudWindow.audiosrc_flip.pause();
			CommunityFeudWindow.audiosrc_flip.currentTime = 0;
			CommunityFeudWindow.audiosrc_flip.play();
			CommunityFeudWindow.audiosrc_flip.volume = Math.random() * 0.05 + 0.05;
			CommunityFeudWindow.audiosrc_flip.playbackRate = Math.random() * 0.05 + 1.0;
		}
	}

	PlayDing()
	{
		this.InitAudio();
		if (CommunityFeudWindow.audiosrc_ding)
		{
			CommunityFeudWindow.audiosrc_ding.pause();
			CommunityFeudWindow.audiosrc_ding.currentTime = 0;
			CommunityFeudWindow.audiosrc_ding.play();
			CommunityFeudWindow.audiosrc_ding.volume = Math.random() * 0.1 + 0.2;
			CommunityFeudWindow.audiosrc_ding.playbackRate = Math.random() * 0.05 + 1.0;
		}
	}

	onWindowShow()
	{
		CommunityFeudWindow.instance = this;
		this.sub_answer = CommunityFeudWindow.event_AnswersChanged.RequestSubscription(() => this.UpdateAnswerPanels());
		this.sub_chat_message = ChatCollector.onMessageReceived.RequestSubscription(x => this.CheckChatMessage(x));
		this.sub_answer_revealed = CommunityFeudWindow.event_AnswerRevealed.RequestSubscription(x => window.setTimeout(() => this.PlayDing(), 200));
		this.sub_answer_hidden = CommunityFeudWindow.event_AnswerHidden.RequestSubscription(x => window.setTimeout(() => this.PlayFlip(), 200));
	}

	onWindowClose()
	{
		if (this.background_animation) this.background_animation.Stop();
		if (this.sub_answer) CommunityFeudWindow.event_AnswersChanged.RemoveSubscription(this.sub_answer);
		if (this.sub_chat_message) ChatCollector.onMessageReceived.RemoveSubscription(this.sub_chat_message);
		if (this.sub_answer_revealed) CommunityFeudWindow.event_AnswerRevealed.RemoveSubscription(this.sub_answer_revealed);
		if (this.sub_answer_hidden) CommunityFeudWindow.event_AnswerHidden.RemoveSubscription(this.sub_answer_hidden);
		CommunityFeudWindow.instance = null;
	}
}

WindowManager.instance.windowTypes.push(
	{
		key: CommunityFeudWindow.window_kind,
		icon: CommunityFeudWindow.window_icon,
		icon_color: 'orange',
		desc: "Manage a session of Community Feud, an answer collecting tool styled after Family Feud! Comes with some preset questions, or you can type your own!",
		model: (x, y) => { return new CommunityFeudWindow(x, y); },
		shortcutKey: 'f'
	}
);