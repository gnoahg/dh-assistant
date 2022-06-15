import { Listener, ListenerOptions } from "@sapphire/framework";
import { ApplyOptions } from "@sapphire/decorators";
import { ButtonInteraction, Interaction, MessageActionRow, MessageButton } from "discord.js";

@ApplyOptions<ListenerOptions>({ event: "interactionCreate" })
export default class InteractionCreateListener extends Listener {
	public run(interaction: Interaction) {
		if (interaction.inCachedGuild() && interaction.isButton()) {
			void this.container.client.ticketHandler.handleInteraction(interaction);
			void this.handleAdrequest(interaction);
			void this.handlePingRequest(interaction);
		}
	}

	private async handlePingRequest(interaction: ButtonInteraction<"cached">) {
		const { client } = this.container;
		const [confirm, type] = interaction.customId.split(/-/g);
		if (!confirm || confirm !== "pingrequest" || !type) return;

		const finish = async () => {
			const components = new MessageActionRow().addComponents(
				new MessageButton().setStyle("SUCCESS").setEmoji(client.constants.emojis.greentick).setDisabled(true).setCustomId("custom_id_1"),
				new MessageButton().setStyle("DANGER").setEmoji(client.constants.emojis.redcross).setDisabled(true).setCustomId("custom_id_2")
			);

			await interaction.update({ components: [components] });
		};

		const eventsChannel = await client.utils.getChannel(client.constants.channels.eventsChannel);
		if (!eventsChannel || !eventsChannel.isText()) return finish();

		switch (type) {
			case "accept":
				await eventsChannel.send({
					content: "🔼 New event announcement/information! <@&702176526795276349>",
					allowedMentions: { roles: ["702176526795276349"] }
				});
				break;
			default:
				break;
		}

		await finish();
	}

	private async handleAdrequest(interaction: ButtonInteraction<"cached">) {
		const { client } = this.container;
		const [caseId, type] = interaction.customId.split(/-/g);
		if (!caseId || !type) return;

		const adrequest = await client.prisma.adrequest.findFirst({ where: { caseId } });
		if (!adrequest) return;

		const [userId] = adrequest.id.split(/-/g);
		const channel = await client.utils.getChannel(client.constants.channels.adchannel);
		if (!channel || !channel.isText() || channel.type !== "GUILD_TEXT") {
			await interaction.deferReply();
			await interaction.deleteReply();
			await client.prisma.adrequest.delete({ where: { caseId: adrequest.caseId } });

			return this.container.client.loggers.get("bot")?.error(`Channel "${channel?.id}" is not a valid text channel!`);
		}

		const user = await client.utils.fetchUser(userId);
		if (!user) {
			await interaction.deferReply();
			await interaction.deleteReply();
			await client.prisma.adrequest.delete({ where: { caseId: adrequest.caseId } });

			return;
		}

		switch (type) {
			case "accept":
				await interaction.deferUpdate();
				await interaction.deleteReply();
				await client.prisma.adrequest.delete({ where: { caseId: adrequest.caseId } });
				await channel.send(`>>> 💰 | Ad - <@${userId}>\n${interaction.message.embeds[0].description}`);
				break;
			case "decline":
				{
					const deleteMsg = async (reason = "No reason provided") => {
						await interaction.deleteReply();
						await client.prisma.adrequest.delete({ where: { caseId: adrequest.caseId } });

						if (user) {
							await user.send(`>>> ❗ | Adrequest declined: ${reason}`);
							client.requests.delete(user.id);
						}
					};
					await interaction.update({ components: [], embeds: [], content: "Why did you decline this adrequest?" });

					const msg = await interaction.channel?.messages.fetch(interaction.message.id);
					if (!msg) {
						await deleteMsg("Something went wrong while processing your request.");
						return client.loggers.get("bot")?.fatal(`[AdrequestHandler]: unable to fetch message ${interaction.message.id}`);
					}

					const collector = await client.utils.awaitMessages(msg, {
						filter: (m) => m.author.id === interaction.user.id
					});
					const first = collector.first();
					if (!first || !first.content) return deleteMsg();

					await deleteMsg(first.content);
				}
				break;
			default:
				break;
		}
	}
}
