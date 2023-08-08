require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActivityType,
} = require("discord.js");
const { Web3 } = require("web3");
const axios = require("axios");
const express = require("express");
const contractABI = require("./jackpotABI.json");
const app = express();

const baseRPC = "https://mainnet.base.org"; // Replace with your Infura Project ID
const jackpotAddress = "0x4a3b44485B61E89b3A0fD656fbfC45b7FA2e8108"; // Replace with your contract address

const web3 = new Web3(baseRPC);
const contract = new web3.eth.Contract(contractABI, jackpotAddress);

app.get("/", function (req, res) {
  const dateTimeNow = new Date().toISOString();
  console.log(`Ogre BOT ALIVE @${dateTimeNow}`);
  res.send(`Ogre BOT ALIVE @${dateTimeNow}`);
});

// Listening to server at port 3000
app.listen(process.env.PORT, function () {
  console.log("OGRE BOT SERVER STARTED");
});

async function start() {
  console.log("[Start]");
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel],
  });

  client.on("ready", () => {
    fetchJackpot();

    setInterval(() => {
      console.log("in interval");
      try {
        fetchJackpot();
      } catch (e) {
        console.error(e);
      }
    }, 60000);
  });

  async function fetchJackpot() {
    console.log("[fetchJackpot]");

    try {
      const priceResponse = await axios.get(
        "https://api.dexscreener.com/latest/dex/pairs/base/0xbb2a2d17685c3bc71562a87fa4f66f68999f59c7"
      );
      const ogrePrice = Number(priceResponse.data.pairs[0].priceUsd).toFixed(2);
      const dailyPot = await contract.methods.dailyPot().call();
      const nextRound = Number(await contract.methods.nextRound().call());

      const dailyPotFormatted = Number(dailyPot) / 1e18;
      const endsIn = timestampToEndDate(nextRound);

      client.user.setPresence({
        activities: [
          {
            name: `Jackpot ends in ${endsIn}`,
            type: ActivityType.Playing,
          },
        ],
        status: "online",
      });

      client.guilds.cache.forEach(async (guild) => {
        try {
          const member = await guild.members.fetch(client.user.id);
          await member.setNickname(
            `POT: $${(ogrePrice * dailyPotFormatted).toFixed(2)}`
          );
          console.log(`Updated nickname`);
        } catch (error) {
          console.error(
            `Failed to update nickname in guild: ${guild.name}`,
            error
          );
        }
      });
      console.log("return");
    } catch (e) {
      console.error(e);
    }
  }

  function timestampToEndDate(toDate) {
    const countdown = toDate - new Date().getTime() / 1000;
    const hours = Math.floor((countdown % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((countdown % (60 * 60)) / 60);

    if (countdown < 0) {
      return "Ended";
    } else if (hours >= 1) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  client.login(process.env.TOKEN);
}

start();
