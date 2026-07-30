// 🌐 سيرفر استقبال بيانات الشراء من روبلوكس + جلب الصورة الحقيقية + إرسالها لديسكورد
// نسخة مطوّرة: صورة أفاتار اللاعب + تاريخ إنشاء الحساب + وقت دخول السيرفر + الرصيد
// + اللوحة المتولدة + تنبيه تلقائي (@here) إذا طلعت لوحة نادرة

const express = require("express");
const app = express();
app.use(express.json());

// 🔑 حط رابط الويبهوك حقك هنا (أو خليه Environment Variable باسم DISCORD_WEBHOOK_URL على Render)
const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1532173462087405568/U2JGDHgNTNA4iz-VeXm3nsfhAAeocT93zS4GZERBv_bRMs4Ajmxv6wIymk6y25QTQGNX";

// 🔔 من تريد أن يُنبَّه عند لوحة نادرة (رتبة أو @here). مثال رتبة: "<@&123456789012345678>"
const RARE_PLATE_MENTION = process.env.RARE_PLATE_MENTION || "@here";

// 🎨 ألوان حسب نوع الدفع، وألوان خاصة تطغى عليها لو اللوحة نادرة
const PAYMENT_COLORS = {
  ROBUX: 16766720, // ذهبي
  CASH: 3066993, // أخضر
};
const RARITY_COLORS = {
  legendary: 15277667, // ذهبي لامع
  very_rare: 10181046, // بنفسجي
  rare: 3447003, // أزرق
};

// 🖼️ يجيب صورة السيارة الحقيقية من Roblox Thumbnails API
async function getRobloxThumbnail(assetId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=420x420&format=Png&isCircular=false`
    );
    const data = await res.json();
    const entry = data?.data?.[0];
    if (entry && entry.state === "Completed" && entry.imageUrl) {
      return entry.imageUrl;
    }
    console.log("لم يتم توليد صورة السيارة بعد أو الأسيت غير صالح:", entry);
    return null;
  } catch (err) {
    console.error("فشل جلب صورة السيارة من روبلوكس:", err);
    return null;
  }
}

// 🙂 يجيب صورة أفاتار اللاعب (Headshot) من Roblox Thumbnails API
async function getAvatarThumbnail(userId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
    );
    const data = await res.json();
    const entry = data?.data?.[0];
    if (entry && entry.state === "Completed" && entry.imageUrl) {
      return entry.imageUrl;
    }
    console.log("لم يتم توليد صورة الأفاتار بعد:", entry);
    return null;
  } catch (err) {
    console.error("فشل جلب صورة الأفاتار من روبلوكس:", err);
    return null;
  }
}

// 🧾 يبني رسالة الـ Embed بشكل منظم
function buildEmbed({
  buyerName,
  carName,
  priceText,
  isRobux,
  speed,
  totalOwned,
  carImageUrl,
  avatarUrl,
  plateText,
  isRarePlate,
  rarityTier,
  rarityLabel,
  currentCash,
  accountCreatedTimestamp,
  serverJoinTimestamp,
}) {
  const paymentEmoji = isRobux ? "🟡" : "💵";
  const paymentLabel = isRobux ? "روبكس (Robux)" : "كاش داخل اللعبة";

  // اللون: نادر يطغى على لون طريقة الدفع
  const color =
    (isRarePlate && RARITY_COLORS[rarityTier]) ||
    (isRobux ? PAYMENT_COLORS.ROBUX : PAYMENT_COLORS.CASH);

  const titlePrefix = isRarePlate ? "🚨✨ " : "🚗  ";

  const fields = [
    {
      name: `${paymentEmoji}  السعر`,
      value: `${priceText || "غير معروف"}`,
      inline: true,
    },
    {
      name: "💳  نوع الدفع",
      value: paymentLabel,
      inline: true,
    },
    {
      name: "🏎️  السرعة",
      value: `${speed ?? "غير محدد"}`,
      inline: true,
    },
    {
      name: "🎟️  اللوحة",
      value: `${plateText || "غير معروفة"}`,
      inline: true,
    },
    {
      name: "💰  الرصيد الحالي",
      value: currentCash != null ? `${currentCash.toLocaleString("en-US")}` : "غير معروف",
      inline: true,
    },
    {
      name: "👥  عدد ملّاك هذي السيارة",
      value: `${totalOwned ?? 0}`,
      inline: true,
    },
  ];

  if (accountCreatedTimestamp) {
    fields.push({
      name: "📅  تاريخ إنشاء حساب الروبلوكس",
      value: `<t:${accountCreatedTimestamp}:D>`,
      inline: true,
    });
  }

  if (serverJoinTimestamp) {
    fields.push({
      name: "🕒  دخل هذا السيرفر",
      value: `<t:${serverJoinTimestamp}:R>`,
      inline: true,
    });
  }

  if (isRarePlate) {
    fields.push({
      name: "🌟  درجة الندرة",
      value: rarityLabel,
      inline: true,
    });
  }

  const embed = {
    author: {
      name: `${buyerName || "غير معروف"} — سجل المشتريات`,
      icon_url: avatarUrl || undefined,
    },
    title: `${titlePrefix}عملية شراء جديدة — ${carName || "غير معروف"}`,
    description: isRarePlate
      ? `**${buyerName}** اشترى **${carName}** وطلعت له لوحة **${rarityLabel}**! 🎉`
      : `**${buyerName}** اشترى سيارة **${carName}** للتو! 🎉`,
    color,
    fields,
    footer: {
      text: "Car Dealership System",
      icon_url: avatarUrl || undefined,
    },
    timestamp: new Date().toISOString(),
  };

  if (carImageUrl) {
    embed.image = { url: carImageUrl };
  }
  if (avatarUrl) {
    embed.thumbnail = { url: avatarUrl };
  }

  return embed;
}

// 📩 نقطة الاستقبال اللي راح يستدعيها سكربت روبلوكس
app.post("/car-purchase", async (req, res) => {
  try {
    const {
      buyerName,
      userId,
      carName,
      priceText,
      isRobux,
      speed,
      totalOwned,
      assetId,
      plateText,
      isRarePlate,
      rarityTier,
      rarityLabel,
      currentCash,
      accountCreatedTimestamp,
      serverJoinTimestamp,
    } = req.body;

    console.log("📦 طلب شراء جديد:", req.body);

    const [carImageUrl, avatarUrl] = await Promise.all([
      assetId ? getRobloxThumbnail(assetId) : Promise.resolve(null),
      userId ? getAvatarThumbnail(userId) : Promise.resolve(null),
    ]);

    const embed = buildEmbed({
      buyerName,
      carName,
      priceText,
      isRobux,
      speed,
      totalOwned,
      carImageUrl,
      avatarUrl,
      plateText,
      isRarePlate,
      rarityTier,
      rarityLabel,
      currentCash,
      accountCreatedTimestamp,
      serverJoinTimestamp,
    });

    const messageBody = {
      username: "Car Dealership Logs",
      embeds: [embed],
    };

    // 🔔 تنبيه مباشر (منشن) إذا اللوحة نادرة
    if (isRarePlate) {
      messageBody.content = `${RARE_PLATE_MENTION} 🚨 **لوحة نادرة طلعت!** (${rarityLabel})`;
    }

    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messageBody),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      console.error("فشل الإرسال لديسكورد:", discordRes.status, text);
      return res.status(500).json({ success: false, error: text });
    }

    res.json({ success: true, carImageFound: !!carImageUrl, avatarFound: !!avatarUrl });
  } catch (err) {
    console.error("خطأ عام:", err);
    res.status(500).json({ success: false, error: String(err) });
  }
});

// 🩺 نقطة فحص بسيطة عشان تتأكد السيرفر شغال
app.get("/", (req, res) => {
  res.send("Car Dealership Webhook Server is running ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
