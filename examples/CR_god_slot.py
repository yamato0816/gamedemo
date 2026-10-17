card.name = "CR 神台・確率の暴力"
card.description = "先バレ99%（演出上）。777は全敵即死級、666は自分が地獄へ。店長の気分で世界が壊れる。"
card.type = "item"
card.emoji = "🎰"
card.element = "lightning"
card.power = 0
card.cost = 7
card.resource = "gold"
card.effect = "normal"
card.weight = 1

def on_play():
    a = randint(0, 9)
    b = randint(0, 9)
    c = randint(0, 9)

    popup("🔴 先バレ発生！！", "期待度99%！！ ※演出上の数字です", "🚨", "neon", 1000)
    popup_update("🎰 図柄変動開始", "【？】【？】【？】", "🎰", "sunset", 700)
    popup_update("第一停止！", "【{a}】【？】【？】", "🟥", "neon", 850)

    if a == 7:
        popup_update("✨ 金保留に昇格！", "これはもらっただろ！？", "🌟", "gold", 700)

    popup_update("第二停止！", "【{a}】【{b}】【？】", "⚡", "aurora", 950)

    if a == b:
        popup_update("🔥 激アツリーチ！！", "【{a}】【{b}】【？】 ボタンを押せ！", "🔥", "sunset", 1250)
        popup_wait(550)
    else:
        popup_update("……まだ終わらない？", "【{a}】【{b}】【？】", "👁️", "info", 650)

    popup_update("最終停止！！", "【{a}】【{b}】【{c}】", "🎰", "neon", 1100)

    if a == 7 and b == 7 and c == 7:
        popup_update("🌈 全回転・777降臨 🌈", "おめでとう。世界が終わります。", "👑", "rainbow", 2200)
        popup_wait(500)
        popup_update("💥 777777 DAMAGE 💥", "敵全員に777777ダメージ！ 77777Gold獲得！", "🌈", "rainbow", 1900)
        damage("all_enemies", 777777)
        resource("self", "gold", 77777)

    elif a == 6 and b == 6 and c == 6:
        popup_update("👹 666 地獄確変 👹", "大当たりです！ あなたにだけ。", "😈", "danger", 1600)
        popup_update("📉 店長からのお知らせ", "自分のHPは1！ 手札全消去！ 敵に666Gold！", "💀", "sunset", 1800)
        set_hp("self", 1)
        clear_hand("self")
        resource("target", "gold", 666)

    elif a == 0 and b == 0 and c == 0:
        popup_update("🧑‍💼 店長、緊急来店", "これより公平性を破棄します。", "🧑‍💼", "aurora", 1500)
        popup_update("🌈 裏基板が起動しました", "相手とHP・手札を交換！ さらにGold強奪！", "💻", "rainbow", 2100)
        swap_stat("hp")
        swap_hands()
        steal("gold", 1000)

    elif a == b and b == c:
        prize = (a + 1) * 777
        popup_update("✨ ゾロ目大当たり！", "図柄 {a}{b}{c}！ 全敵 {prize} ダメージ！", "💎", "gold", 2200)
        damage("all_enemies", prize)
        heal("self", (a + 1) * 7)
        resource("self", "gold", (a + 1) * 111)

    elif a + b + c == 21:
        popup_update("🔇 無音……まさか？", "合計 {a+b+c}。秘密の裏ルートです。", "👁️", "aurora", 1150)
        popup_update("🌈 裏・大当たり！", "敵全員のHPを1に！ 自分にバリア210！", "🌈", "rainbow", 2200)
        set_hp("all_enemies", 1)
        shield("self", 210)

    elif a == b:
        if chance(0.1):
            popup_update("🌈 復活大当たり！！", "激アツ外れ……からの逆転！ 全敵7777ダメージ！", "🌈", "rainbow", 2700)
            damage("all_enemies", 7777)
            resource("self", "gold", 777)
        else:
            popup_update("💔 激アツ、普通に外れ", "先バレ99%（大嘘）！ HP半減、敵に99Gold！", "💀", "danger", 2400)
            damage("self", max(1, my_hp() // 2))
            resource("target", "gold", 99)

    elif a == 7 or b == 7 or c == 7:
        popup_update("💰 金保留はずれ！", "7があるのにハズレ！ HP-7、敵に77Gold！", "🥀", "danger", 2200)
        damage("self", 7)
        resource("target", "gold", 77)

    else:
        popup_update("🤡 本日の養分：あなた", "HP-11、Gold-11、敵に11Gold。ご遊技感謝！", "🪦", "danger", 1700)
        damage("self", 11)
        resource("self", "gold", -11)
        resource("target", "gold", 11)

    battle_log("🎰 {self.name} の抽選結果：【{a}{b}{c}】")