// 🌐 سيرفر استقبال بيانات الشراء من روبلوكس + جلب الصورة الحقيقية + إرسالها لديسكورد
const express = require("express");
const app = express();
app.use(express.json());

// 🔑 حط رابط الويبهوك حقك هنا (أو خليه Environment Variable باسم DISCORD_WEBHOOK_URL على Render)
const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  "https://discord.com/api/webhooks/1532173462087405568/U2JGDHgNTNA4iz-VeXm3nsfhAAeocT93zS4GZERBv_bRMs4Ajmxv6wIymk6y25QTQGNX";

// 🖼️ يجيب رابط الصورة الحقيقي من Roblox Thumbnails API (مسموح لأننا مو جوا روبلوكس)
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
    console.log("لم يتم توليد الصورة بعد أو الأسيت غير صالح:", entry);
    return null;
  } catch (err) {
    console.error("فشل جلب الصورة من روبلوكس:", err);
    return null;
  }
}

// 📩 نقطة الاستقبال اللي راح يستدعيها سكربت روبلوكس
app.post("/car-purchase", async (req, res) => {
  try {
    const {
      buyerName,
      carName,
      priceText,
      isRobux,
      speed,
      totalOwned,
      assetId,
    } = req.body;

    console.log("📦 طلب شراء جديد:", req.body);

    let imageUrl = null;
    if (assetId) {
      imageUrl = await getRobloxThumbnail(assetId);
    }

    const embed = {
      title: "🚗 عملية شراء جديدة!",
      color: 3066993,
      fields: [
        { name: "المشتري", value: String(buyerName || "غير معروف"), inline: true },
        { name: "السيارة", value: String(carName || "غير معروف"), inline: true },
        { name: "السعر", value: String(priceText || "غير معروف"), inline: true },
        {
          name: "نوع الدفع",
          value: isRobux ? "روبكس (Robux)" : "كاش داخل اللعبة",
          inline: true,
        },
        { name: "السرعة", value: String(speed ?? "غير محدد"), inline: true },
        {
          name: "عدد الملاك الحاليين",
          value: String(totalOwned ?? 0),
          inline: true,
        },
      ],
    };

    if (imageUrl) {
      embed.thumbnail = { url: imageUrl };
    }

    const discordRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Car Dealership Logs",
        embeds: [embed],
      }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      console.error("فشل الإرسال لديسكورد:", discordRes.status, text);
      return res.status(500).json({ success: false, error: text });
    }

    res.json({ success: true, imageFound: !!imageUrl });
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
