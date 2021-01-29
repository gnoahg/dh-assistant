import { Listener } from "discord-akairo";
import { GuildMember, MessageEmbed } from "discord.js";
import { systemLog, systemLogPublic } from "../../client/config";
import moment from "moment";

export default class guildMemberRemove extends Listener {
	constructor() {
		super("guildMemberRemove", {
			emitter: "client",
			event: "guildMemberRemove",
			category: "client",
		});
	}

	async exec(member: GuildMember) {
		const channel = await this.client.utils.getChannel(systemLog);
		const joinDate = moment(member.joinedTimestamp).fromNow();

		if (!member.user.bot) this.bye(member);

		const embed = new MessageEmbed()
			.setColor("#FFF4B4")
			.setFooter(`ID: ${member.id}`)
			.setTitle("Member left: " + member.user.tag)
			.setDescription([
				`> 👤 | **User**: ${member.toString()}`,
				`> 📅 | **Joined at**: ${joinDate}`,
				`> 🏷 | **roles**: ${this.client.utils
					.trimArray(
						member.roles.cache
							.sort((a, b) => b.position - a.position)
							.map((role) => role.toString())
							.slice(0, -1)
					)

					.join(", ")}`,
			]);

		channel.send(embed);
	}

	async bye(member: GuildMember) {
		const channel = await this.client.utils.getChannel(systemLogPublic);
		const embed = new MessageEmbed()
			.setColor("#DC5E55")
			.setAuthor("Goodbye!")
			.setTitle(`${member.user.tag} left the server!`)
			.setDescription(`Bye bye 😢`)
			.setFooter(`There are now ${member.guild.memberCount} members in this server.`);

		channel.send(embed);
	}
}
