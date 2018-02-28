const Discord = require('discord.js');
const client = new Discord.Client();
const YouTube = require('simple-youtube-api');

const client = new Client({ disableEveryone: true });

const youtube = new YouTube("process.env.GOOGLE_API_KEY");

const queue = new Map();

client.on('ready', () => {
client.user.setPresence({ game: { name: '^help for Commands ', type: 0} });  
  console.log('I am ready!');
});

const prefix = "^";

const queue = new Map();



client.on('warn', console.warn);



client.on('error', console.error);



client.on('message', async msg => { // eslint-disable-line

	if (msg.author.bot) return undefined;

	if (!msg.content.startsWith(PREFIX)) return undefined;



	const args = msg.content.split(' ');

	const searchString = args.slice(1).join(' ');

	const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : '';

	const serverQueue = queue.get(msg.guild.id);



	let command = msg.content.toLowerCase().split(' ')[0];

	command = command.slice(PREFIX.length)



	if (command === 'play') {

		const voiceChannel = msg.member.voiceChannel;

		if (!voiceChannel) return msg.channel.send('I\'m sorry but you need to be in a voice channel to play music!');

		const permissions = voiceChannel.permissionsFor(msg.client.user);

		if (!permissions.has('CONNECT')) {

			return msg.channel.send('I cannot connect to your voice channel, make sure I have the proper permissions!');

		}

		if (!permissions.has('SPEAK')) {

			return msg.channel.send('I cannot speak in this voice channel, make sure I have the proper permissions!');

		}



		if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {

			const playlist = await youtube.getPlaylist(url);

			const videos = await playlist.getVideos();

			for (const video of Object.values(videos)) {

				const video2 = await youtube.getVideoByID(video.id); // eslint-disable-line no-await-in-loop

				await handleVideo(video2, msg, voiceChannel, true); // eslint-disable-line no-await-in-loop

			}

			return msg.channel.send(`✅ Playlist: **${playlist.title}** has been added to the queue!`);

		} else {

			try {

				var video = await youtube.getVideo(url);

			} catch (error) {

				try {

					var videos = await youtube.searchVideos(searchString, 10);

					let index = 0;

					msg.channel.send(`

__**Song selection:**__



${videos.map(video2 => `**${++index} -** ${video2.title}`).join('\n')}



Please provide a value to select one of the search results ranging from 1-10.

					`);

					// eslint-disable-next-line max-depth

					try {

						var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {

							maxMatches: 1,

							time: 10000,

							errors: ['time']

						});

					} catch (err) {

						console.error(err);

						return msg.channel.send('No or invalid value entered, cancelling video selection.');

					}

					const videoIndex = parseInt(response.first().content);

					var video = await youtube.getVideoByID(videos[videoIndex - 1].id);

				} catch (err) {

					console.error(err);

					return msg.channel.send('🆘 I could not obtain any search results.');

				}

			}

			return handleVideo(video, msg, voiceChannel);

		}

	} else if (command === 'skip') {

		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');

		if (!serverQueue) return msg.channel.send('There is nothing playing that I could skip for you.');

		serverQueue.connection.dispatcher.end('Skip command has been used!');

		return undefined;

	} else if (command === 'stop') {

		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');

		if (!serverQueue) return msg.channel.send('There is nothing playing that I could stop for you.');

		serverQueue.songs = [];

		serverQueue.connection.dispatcher.end('Stop command has been used!');

		return undefined;

	} else if (command === 'volume') {

		if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel!');

		if (!serverQueue) return msg.channel.send('There is nothing playing.');

		if (!args[1]) return msg.channel.send(`The current volume is: **${serverQueue.volume}**`);

		serverQueue.volume = args[1];

		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);

		return msg.channel.send(`I set the volume to: **${args[1]}**`);

	} else if (command === 'np') {

		if (!serverQueue) return msg.channel.send('There is nothing playing.');

		return msg.channel.send(`🎶 Now playing: **${serverQueue.songs[0].title}**`);

	} else if (command === 'queue') {

		if (!serverQueue) return msg.channel.send('There is nothing playing.');

		return msg.channel.send(`

__**Song queue:**__



${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}



**Now playing:** ${serverQueue.songs[0].title}

		`);

	} else if (command === 'pause') {

		if (serverQueue && serverQueue.playing) {

			serverQueue.playing = false;

			serverQueue.connection.dispatcher.pause();

			return msg.channel.send('⏸ Paused the music for you!');

		}

		return msg.channel.send('There is nothing playing.');

	} else if (command === 'resume') {

		if (serverQueue && !serverQueue.playing) {

			serverQueue.playing = true;

			serverQueue.connection.dispatcher.resume();

			return msg.channel.send('▶ Resumed the music for you!');

		}

		return msg.channel.send('There is nothing playing.');

	}



	return undefined;

});



async function handleVideo(video, msg, voiceChannel, playlist = false) {

	const serverQueue = queue.get(msg.guild.id);

	console.log(video);

	const song = {

		id: video.id,

		title: Util.escapeMarkdown(video.title),

		url: `https://www.youtube.com/watch?v=${video.id}`

	};

	if (!serverQueue) {

		const queueConstruct = {

			textChannel: msg.channel,

			voiceChannel: voiceChannel,

			connection: null,

			songs: [],

			volume: 5,

			playing: true

		};

		queue.set(msg.guild.id, queueConstruct);



		queueConstruct.songs.push(song);



		try {

			var connection = await voiceChannel.join();

			queueConstruct.connection = connection;

			play(msg.guild, queueConstruct.songs[0]);

		} catch (error) {

			console.error(`I could not join the voice channel: ${error}`);

			queue.delete(msg.guild.id);

			return msg.channel.send(`I could not join the voice channel: ${error}`);

		}

	} else {

		serverQueue.songs.push(song);

		console.log(serverQueue.songs);

		if (playlist) return undefined;

		else return msg.channel.send(`✅ **${song.title}** has been added to the queue!`);

	}

	return undefined;

}



function play(guild, song) {

	const serverQueue = queue.get(guild.id);



	if (!song) {

		serverQueue.voiceChannel.leave();

		queue.delete(guild.id);

		return;

	}

	console.log(serverQueue.songs);



	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))

		.on('end', reason => {

			if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');

			else console.log(reason);

			serverQueue.songs.shift();

			play(guild, serverQueue.songs[0]);

		})

		.on('error', error => console.error(error));

	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);



	serverQueue.textChannel.send(`🎶 Start playing: **${song.title}**`);

}

client.on('message', message => {
  if(message.author.bot) return;  
  if(!message.content.startsWith(prefix)) return;

  let command = message.content.split(" ")[0];
  command = command.slice(prefix.length);

  let args = message.content.split(" ").slice(1);
  
  if (command == "info") {
    
    const embed = new Discord.RichEmbed()
  .setTitle("General Information about the bot.")
  .setAuthor("L00PY", "https://cdn.discordapp.com/attachments/375966965958705162/401987260087533569/LIT2.png")
  /*
   * Alternatively, use "#00AE86", [0, 174, 134] or an integer number.
   */
  .setColor(650491)
  .setDescription("Hello guys I'm L00PY Dev of LIFE BOT just whanted to tell you guys thank you for using my bot :smiley: .")
  .setFooter("Developped by L00PY", "https://cdn.discordapp.com/attachments/375966965958705162/401987260087533569/LIT2.png")
  .setImage("https://cdn.discordapp.com/attachments/311069886363467777/402073027619061775/people.png")
  .setThumbnail("https://cdn.discordapp.com/attachments/311069886363467777/402073027619061775/people.png")
  /*
   * Takes a Date object, defaults to current date.
   */
  .setTimestamp()
  .addField("Coding Language",
    "```\discord.js```")
  /*
   * Inline fields may not display as inline if the thumbnail and/or image is too big.
   */
  .addBlankField(true)
  .addField("Our Discord", "https://discord.gg/X3PVTVH", true);

  message.channel.send({embed});

  }
  
  if (command == "help") {

		const embed = new Discord.RichEmbed()
  .setTitle("My commands")
  .setAuthor("L00PY", "https://cdn.discordapp.com/attachments/375966965958705162/401987260087533569/LIT2.png")
  /*
   * Alternatively, use "#00AE86", [0, 174, 134] or an integer number.
   */
  .setColor(0x00AE86)
  .setDescription("Check below for my commands :arrow_down: ")
  .setFooter("Developed by L00PY", "https://cdn.discordapp.com/attachments/375966965958705162/401987260087533569/LIT2.png")
  /*
   * Takes a Date object, defaults to current date.
   */
  .setTimestamp()
  .addField(" ```\^info```",
    "info on who the made the bot.")
  /*
   * Inline fields may not display as inline if the thumbnail and/or image is too big.
   */
  .addField(" ```\^play```", "play a youtube link.", true)
  /*
   * Blank field, useful to create some space.
   */
  .addBlankField(true)
  .addField(" ```\^stop```", "The Bot will stop playing the current song.", true)
  /*
   * Blank field, useful to create some space.
   */
  .addField(" ```\^pause```", "The bot will pause the current song.", true)
  /*
   * Blank field, useful to create some space.
   */
  .addField(" ```\^resume```", "The bot will resume the current song.", true)
    /*
   * Blank field, useful to create some space.
   */
  .addField(" ```\^vol```", "Set the volume of the music", true)
    /*
   * Blank field, useful to create some space.
   */
  .addField(" ```\^np```", "The current song that is playing", true);

  message.channel.send({embed});
  
  
}

});

client.login("process.env.BOT_TOKEN");
