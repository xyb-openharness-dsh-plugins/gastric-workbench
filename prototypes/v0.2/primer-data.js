/* 小胃宝 Stompal · 疾病概要数据（36 号）
 * 口径：docs/DISEASE-PRIMER.md；规范：starter docs/36-DISEASE-PRIMER.md。
 * 全部内容属第 ② 层（解释）：只写定义、文件、指南列举过的手段、已发生的变化。
 * 任何「你该怎么办」的判断都不在这里，固定出口是「这一句需要问你的医生」。
 *
 * 原件状态照实写：本项目未取得 NCCN / CSCO / AJCC / WHO 的指南原件，
 * 2026 版指南的版本号与更新状态也未核验（见 docs/CLINICAL-DATA-2026.md「2026 指南监测入口」），
 * 因此所有版本号一律写「版本未核实」，页码一律「页码待核」。
 */
window.DISEASE_PRIMER = {
  brand: '小胃宝 Stompal',
  name: '胃癌',
  en: 'Gastric Cancer',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '胃癌是起源于胃黏膜上皮的恶性肿瘤，病理类型以腺癌为主。'
        + '「长在胃的哪一段」和「长到哪一期」是两件事：前者写部位，后者写 TNM，本台分开记录、不互相推导。',
      points: [
        '部位按上 1/3、中 1/3、下 1/3 与贲门记录，用哪一段的写法以胃镜与病理报告原文为准。',
        '病理类型照报告原文抄（腺癌及其亚型等），本台不改写、不合并、不换算。',
        '分期为 TNM 体系，具体采用哪一版以病理与影像报告上标注的为准；本台不自行分期、不把部位推成分期。',
        '四个标志物 HER2 / PD-L1 CPS / MSI / CLDN18.2 各自独立记录为「检测了 / 未检测 / 待出」三态，未检测不补成阴性。',
        '腹膜转移与腹腔治疗在本台单列，不与肝转移、淋巴结转移合并成一条。'
      ],
      sources: [
        { org: 'WHO', doc: 'Classification of Tumours: Digestive System Tumours', version: '版本未核实', original: false, page: '页码待核', secondaryUrl: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019' },
        { org: 'AJCC', doc: 'Cancer Staging Manual（胃章节）', version: '版本未核实', original: false, page: '页码待核', secondaryUrl: 'https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/cancer-staging-systems/' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这台工作台里出现的每一条「该查什么、该怎么分期」，都应能追到下面某一份文件。'
        + '本项目对这几份文件都没有取得原件，2026 版的版本号与更新状态也尚未核验——表格里照实写，不假装看过。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          ['NCCN', 'NCCN Guidelines · Gastric Cancer', '2026 年版（版本号与更新状态未核验）',
            { text: '未取得原件', url: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1434' },
            '分期检查与治疗路径的并列引用；本轮不引用具体条文'],
          ['CSCO', 'CSCO 胃癌诊疗指南', '2026 年版（版本号与更新状态未核验）',
            { text: '未取得原件（官网指南浏览需会员登录）', nolink: true, note: 'CSCO 指南浏览需会员登录（官网指南页为空壳、跳转 meeting.csco.org.cn 会员入口），官网无公开 2026 版 PDF' },
            '国内可及药物与本土实践差异；本轮不引用具体条文'],
          ['ESMO', 'ESMO Gastric Cancer Guidelines', '2026 更新状态未核验',
            { text: '未取得原件', url: 'https://www.esmo.org/guidelines/esmo-clinical-practice-guideline-gastric-and-oesophageal-cancer' },
            '仅登记其存在，不作引用依据'],
          ['AJCC', 'Cancer Staging Manual（胃章节）', '版本未核实',
            { text: '未取得原件', url: 'https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/cancer-staging-systems/' },
            'TNM 分期口径；与国内分期并存时两行并列、不换算'],
          ['WHO', 'Digestive System Tumours', '版本未核实',
            { text: '未取得原件', url: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019' },
            '病理类型命名的唯一口径']
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」。版本号必须写清：同一份指南隔一年，条目会变。',
        '本台对未取得原件的文件只记「存在」与「大致讲什么」，不引用其具体条文，页码一律写待核。',
        '在核对中国现行指南全文之前，本台不生成任何「按最新指南」的治疗解释内容。',
        'NCCN、CSCO、ESMO 的来源地区与适用边界不同，本台并列列出，不做取舍、不做换算。'
      ],
      sources: [
        { org: 'NCCN', doc: 'NCCN Guidelines · Gastric Cancer', version: '2026 年版（未核验）', original: false, page: '页码待核', secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1434' },
        { org: 'CSCO', doc: 'CSCO 胃癌诊疗指南', version: '2026 年版（未核验）', original: false, page: '页码待核', nolink: true, note: 'CSCO 指南浏览需会员登录，官网无公开 2026 版 PDF' },
        { org: 'ESMO', doc: 'ESMO Gastric Cancer Guidelines', version: '2026 更新状态未核验', original: false, page: '页码待核', secondaryUrl: 'https://www.esmo.org/guidelines/esmo-clinical-practice-guideline-gastric-and-oesophageal-cancer' },
        { org: 'AJCC', doc: 'Cancer Staging Manual（胃章节）', version: '版本未核实', original: false, page: '页码待核', secondaryUrl: 'https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/cancer-staging-systems/' },
        { org: 'WHO', doc: 'Digestive System Tumours', version: '版本未核实', original: false, page: '页码待核', secondaryUrl: 'https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按期别与线序列出指南里出现过的手段类别。这是「世界上大致有哪些办法」的地图，不是给你排的先后顺序，'
        + '也不含任何剂量、疗程与适用条件——那些必须由医生按你的病理、影像与检测结果决定。',
      groups: [
        {
          label: '局限期（病变可以切除时）',
          points: [
            '内镜切除：EMR / ESD 被列为早期病变的处理方式之一，是否适用由内镜所见与病理评估决定。',
            '手术：远端胃切除、近端胃切除、全胃切除与淋巴结清扫被列出；切多少、怎么重建，按手术记录原文记录，本台不改写。',
            '围手术期化疗：术前与术后两个阶段在指南里分开表述，本台按阶段分开记录，不合并成一段。',
            '术后辅助化疗：术后病理存在特定风险因素时被列出；是否使用、用哪种方案属于医生判断。',
            '放化疗：在部分情形下被列为可讨论选项，适用条件按指南与医生安排执行。'
          ]
        },
        {
          label: '晚期 / 转移后',
          points: [
            '全身化疗：以氟尿嘧啶类与铂类为基础的化疗是长期存在的选项，后续线序可包含其他化疗药。',
            'HER2 靶向治疗：指南针对 HER2 阳性情形单列；HER2 状态按检测报告原值记录，本台不判断阴阳之外的强弱。',
            '免疫检查点抑制剂：指南按 PD-L1 CPS、MSI/dMMR 等检测结果分层列出，具体是否适用由医生依据报告判断。',
            'CLDN18.2 靶向治疗：指南针对 CLDN18.2 阳性情形列出，本台只记录检测原值。',
            '腹腔治疗：腹膜转移情形下的腹腔灌注等做法被列出，本台单列记录，不评价疗效。',
            '临床研究：指南把「参加登记良好的临床试验」列为一项正式选项，而不是最后手段。'
          ]
        },
        {
          label: '贯穿全程的两件事',
          points: [
            '营养与进食：切除方式不同，进食调整与 B12 / 铁 / 钙等补充的医嘱也不同；本台只记医嘱原文与起止，不给剂量建议。',
            '随访：胃镜与影像的复查节点按指南与医生安排执行，本台只把「约在哪天、做了没有」整理成时间线。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: 'NCCN', doc: 'NCCN Guidelines · Gastric Cancer', version: '2026 年版（未核验）', original: false, page: '页码待核', secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1434' },
        { org: 'CSCO', doc: 'CSCO 胃癌诊疗指南', version: '2026 年版（未核验）', original: false, page: '页码待核', nolink: true, note: 'CSCO 指南浏览需会员登录，官网无公开 2026 版 PDF' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生、且本项目能追到出处的事：登记平台上多了多少条、哪份文件换了版本、哪一天生效。'
        + '本项目尚未核验到 2026 版指南的具体版本号与生效日期，因此本段不列「版本更替」条目——查不到就不写。'
        + '登记数量随检索日期变化，检索式与日期记录在 docs/CLINICAL-DATA-2026.md。',
      points: [
        '2026-01-01 至采集日：ClinicalTrials.gov 上「2026 年首次公示」的胃癌 / 胃食管交界（GEJ）干预性研究登记 236 条，其中疾病特异 223 条、广谱篮式 13 条；ChinaDrugTrials 与 ChiCTR 本轮未采集，中国登记总量未知。阶段分布本台尚未统计。',
        '同一资料包的关键词近似命中数（同一研究可多命中，不是人工分类）：HER2 43、围手术期 71、辅助 57、PD-L1/PD-1 31、细胞治疗 21、CLDN18.2 18、腹膜转移 13、MSI/dMMR 12、腹腔灌注 10、ADC 5、CAR-T 5。'
      ],
      sources: [
        { org: 'ClinicalTrials.gov', doc: '2026 年胃癌 / GEJ 干预性研究登记资料包（trials-2026.jsonl）', version: '检索日 2026-10（首次公示 2026-01-01 起）', original: true, nolink: true, note: '一手登记数据，本项目自采快照；第三方原件未存档，无公开可点 URL。ChinaDrugTrials 与 ChiCTR 未采集' },
        { org: 'NCCN', doc: 'NCCN Guidelines · Gastric Cancer', version: '2026 年版（未核验）', original: false, page: '页码待核', secondaryUrl: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1434' },
        { org: 'CSCO', doc: 'CSCO 胃癌诊疗指南', version: '2026 年版（未核验）', original: false, page: '页码待核', nolink: true, note: 'CSCO 指南浏览需会员登录，官网无公开 2026 版 PDF' }
      ]
    }
  ]
}
