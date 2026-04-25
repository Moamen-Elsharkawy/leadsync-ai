# Demo Conversations

These sample conversations are safe fake data for portfolio demos. They show the intended Arabic customer experience while keeping all internal implementation details in English.

## Dental Clinic: Hot Lead

Customer:
مساء الخير، محتاج استشارة زراعة أسنان الأسبوع ده. عندي أشعة جاهزة وميزانيتي حوالي ٢٥ ألف.

Bot:
أهلا بحضرتك. هل يمكنك إرسال رقم هاتف حتى يتواصل معك فريق الاستقبال لتأكيد التفاصيل؟

Customer:
رقمي 01011110001 وممكن حد يكلمني النهارده؟

Bot:
تمام، سجلت التفاصيل وسأرسلها لفريق الاستقبال للمراجعة والتواصل معك. لا يوجد تأكيد موعد أو سعر نهائي قبل مراجعة الفريق.

Expected result:

- Service: زراعة الأسنان
- Budget: 25000 EGP
- Timeline: this week
- Status: Hot
- Admin notification: yes

## Dental Clinic: Warm Lead

Customer:
ممكن أعرف تفاصيل تنظيف وتلميع الأسنان؟

Bot:
أكيد. هل تفكرين في زيارة قريبة أم تريدين معرفة التفاصيل أولا؟

Customer:
غالبا الأسبوع الجاي، بس محتاجة أعرف النظام الأول.

Bot:
شكرا للتوضيح. سجلت اهتمامك بتنظيف وتلميع الأسنان، ويمكن لفريق الاستقبال توضيح التفاصيل المناسبة بدون تأكيد سعر نهائي قبل المراجعة.

Expected result:

- Service: تنظيف وتلميع الأسنان
- Timeline: next week
- Status: Warm
- Follow-up: queued in production, customer sending disabled when `DEMO_MODE=true`

## Online Course: Hot Lead

Customer:
عايز أشترك في كورس Data Analysis وأبدأ الأسبوع ده. ميزانيتي حوالي ٥ آلاف.

Bot:
ممتاز. هل يمكنك إرسال رقم هاتف أو طريقة تواصل مفضلة حتى يتابع معك فريق القبول؟

Customer:
رقمي 01033330001 ومحتاج أعرف الخطوات.

Bot:
تمام، سجلت بياناتك وسأرسل الطلب لفريق القبول للمراجعة والتواصل معك. لا يوجد تأكيد اشتراك أو خصم قبل مراجعة الفريق.

Expected result:

- Service: الاشتراك في كورس فردي
- Budget: 5000 EGP
- Timeline: this week
- Status: Hot
- Admin notification: yes

## Online Course: Warm Lead

Customer:
أنا محتار أبدأ Data ولا Marketing ومحتاج حد يوجهني.

Bot:
أكيد. هل ترغب في البدء هذا الشهر أم تجمع معلومات حاليا؟

Customer:
غالبا هذا الشهر، بس لسه مش محدد الميزانية.

Bot:
شكرا للتوضيح. سجلت اهتمامك باستشارة اختيار مسار التعلم، ويمكن لفريق القبول مساعدتك في اختيار البرنامج المناسب.

Expected result:

- Service: استشارة اختيار مسار التعلم
- Timeline: this month
- Status: Warm
- Follow-up: queued in production, customer sending disabled when `DEMO_MODE=true`

## Cold Lead

Customer:
السلام عليكم

Bot:
وعليكم السلام، ما الخدمة التي تحتاجها بالتحديد؟

Customer:
مش عارف، كنت بس بسأل.

Bot:
لا مشكلة. عندما يكون لديك طلب واضح، أرسل التفاصيل وسنساعدك بالخطوة المناسبة.

Expected result:

- Service: missing
- Status: Cold
- Follow-up: none
