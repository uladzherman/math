window.SECTIONS = [
  { id: "num", title: "Числа и вычисления" },
  { id: "expr", title: "Выражения и их преобразования" },
  { id: "eq", title: "Уравнения и неравенства" },
  { id: "func", title: "Координаты и функции" },
  { id: "geo", title: "Геометрия" }
];

window.TASKS = [

  /* ==================== ЧИСЛА И ВЫЧИСЛЕНИЯ ==================== */
  { id: "num-01", section: "num", level: "I", type: "A",
    question: "Вычислите: $\\dfrac{2^{-3}\\cdot 2^{5}}{2^{0}}$",
    options: ["$4$", "$8$", "$\\dfrac{1}{4}$", "$2$", "$16$"], correct: 0,
    explanation: "При умножении степеней с одинаковым основанием показатели складываются, при делении — вычитаются: $\\dfrac{2^{-3}\\cdot 2^{5}}{2^{0}}=2^{-3+5-0}=2^{2}=4$." },

  { id: "num-02", section: "num", level: "II", type: "A",
    question: "Найдите значение выражения $\\sqrt{50}-\\sqrt{18}+\\sqrt{8}$",
    options: ["$4\\sqrt{2}$", "$2\\sqrt{2}$", "$8\\sqrt{2}$", "$3\\sqrt{2}$", "$0$"], correct: 0,
    explanation: "Вынесем множители из-под корня: $\\sqrt{50}=5\\sqrt{2}$, $\\sqrt{18}=3\\sqrt{2}$, $\\sqrt{8}=2\\sqrt{2}$. Тогда $5\\sqrt{2}-3\\sqrt{2}+2\\sqrt{2}=4\\sqrt{2}$." },

  { id: "num-03", section: "num", level: "II", type: "B",
    question: "Сколько целых чисел принадлежит промежутку $[-\\sqrt{10};\\ \\sqrt{10}]$?",
    answer: "7",
    explanation: "$\\sqrt{10}\\approx 3{,}16$, поэтому границы промежутка приблизительно равны $-3{,}16$ и $3{,}16$. Целые числа: $-3,-2,-1,0,1,2,3$ — всего $7$." },

  { id: "num-04", section: "num", level: "I", type: "B",
    question: "Найдите значение выражения $(\\sqrt{7}-2)(\\sqrt{7}+2)$.",
    answer: "3",
    explanation: "По формуле разности квадратов: $(\\sqrt{7})^{2}-2^{2}=7-4=3$." },

  { id: "num-05", section: "num", level: "II", type: "A",
    question: "Найдите значение выражения $\\dfrac{(\\sqrt{6})^{2}}{2}+\\sqrt{81}$",
    options: ["$12$", "$6$", "$11$", "$9$", "$15$"], correct: 0,
    explanation: "$(\\sqrt{6})^{2}=6$, поэтому $\\dfrac{6}{2}+9=3+9=12$." },

  { id: "num-06", section: "num", level: "II", type: "B",
    question: "Вычислите: $\\log_{2}32-\\log_{3}9$.",
    answer: "3",
    explanation: "$\\log_{2}32=5$ (так как $2^{5}=32$), $\\log_{3}9=2$ (так как $3^{2}=9$). Тогда $5-2=3$." },

  { id: "num-07", section: "num", level: "II", type: "B",
    question: "Найдите значение выражения $5^{\\log_{5}7}$.",
    answer: "7",
    explanation: "По основному логарифмическому тождеству $a^{\\log_{a}b}=b$, значит $5^{\\log_{5}7}=7$." },

  { id: "num-08", section: "num", level: "II", type: "A",
    question: "Товар стоил 400 рублей. Сначала цену снизили на 25 %, затем новую цену повысили на 20 %. Сколько рублей стал стоить товар?",
    options: ["360", "380", "400", "420", "300"], correct: 0,
    explanation: "После снижения: $400\\cdot 0{,}75=300$. После повышения: $300\\cdot 1{,}2=360$ рублей." },

  { id: "num-09", section: "num", level: "II", type: "B",
    question: "Найдите 40 % от числа 250.",
    answer: "100",
    explanation: "$250\\cdot 0{,}4=100$." },

  { id: "num-10", section: "num", level: "I", type: "A",
    question: "Какое из данных чисел наибольшее?",
    options: ["$0{,}7$", "$\\dfrac{2}{3}$", "$\\dfrac{3}{5}$", "$0{,}68$", "$0{,}699$"], correct: 0,
    explanation: "$\\dfrac{2}{3}\\approx 0{,}667$, $\\dfrac{3}{5}=0{,}6$. Сравнивая, получаем: $0{,}7>0{,}699>0{,}68>\\dfrac{2}{3}>\\dfrac{3}{5}$. Наибольшее — $0{,}7$." },

  { id: "num-11", section: "num", level: "III", type: "B",
    question: "Вычислите: $\\sqrt[3]{27}+\\sqrt[3]{-8}$.",
    answer: "1",
    explanation: "$\\sqrt[3]{27}=3$, $\\sqrt[3]{-8}=-2$. Тогда $3+(-2)=1$." },

  { id: "num-12", section: "num", level: "III", type: "B",
    question: "Найдите значение выражения $\\dfrac{1}{4}+0{,}75$.",
    answer: "1",
    explanation: "$\\dfrac{1}{4}=0{,}25$, тогда $0{,}25+0{,}75=1$." },

  { id: "num-13", section: "num", level: "III", type: "A",
    question: "Найдите значение выражения $\\dfrac{7^{-2}\\cdot 7^{5}}{7^{2}}$",
    options: ["$7$", "$49$", "$\\dfrac{1}{7}$", "$343$", "$1$"], correct: 0,
    explanation: "$\\dfrac{7^{-2}\\cdot 7^{5}}{7^{2}}=7^{-2+5-2}=7^{1}=7$." },

  { id: "num-14", section: "num", level: "III", type: "B",
    question: "Найдите произведение чисел $\\sqrt{5}$ и $\\sqrt{20}$.",
    answer: "10",
    explanation: "$\\sqrt{5}\\cdot\\sqrt{20}=\\sqrt{5\\cdot 20}=\\sqrt{100}=10$." },

  { id: "num-15", section: "num", level: "IV", type: "B",
    question: "Найдите значение выражения $\\dfrac{3^{6}\\cdot 5^{4}}{15^{4}}$.",
    answer: "9",
    explanation: "$15^{4}=(3\\cdot 5)^{4}=3^{4}\\cdot 5^{4}$. Тогда $\\dfrac{3^{6}\\cdot 5^{4}}{3^{4}\\cdot 5^{4}}=3^{6-4}=3^{2}=9$." },

  { id: "num-16", section: "num", level: "IV", type: "B",
    question: "Вычислите: $\\log_{2}48-\\log_{2}3$.",
    answer: "4",
    explanation: "$\\log_{2}48-\\log_{2}3=\\log_{2}\\dfrac{48}{3}=\\log_{2}16=4$." },

  { id: "num-17", section: "num", level: "III", type: "A",
    question: "Скольким процентам равно число $0{,}045$?",
    options: ["$4{,}5\\%$", "$0{,}045\\%$", "$45\\%$", "$0{,}45\\%$", "$450\\%$"], correct: 0,
    explanation: "Чтобы перевести число в проценты, умножим его на $100$: $0{,}045\\cdot 100=4{,}5\\%$." },

  { id: "num-18", section: "num", level: "IV", type: "B",
    question: "Найдите значение выражения $\\dfrac{\\sqrt[4]{16}\\cdot\\sqrt{25}}{\\sqrt[3]{125}}$.",
    answer: "2",
    explanation: "$\\sqrt[4]{16}=2$, $\\sqrt{25}=5$, $\\sqrt[3]{125}=5$. Тогда $\\dfrac{2\\cdot 5}{5}=2$." },

  /* ==================== ВЫРАЖЕНИЯ И ПРЕОБРАЗОВАНИЯ ==================== */
  { id: "expr-01", section: "expr", level: "I", type: "A",
    question: "Упростите выражение $\\dfrac{a^{6}\\cdot a^{-2}}{a^{3}}$, где $a\\neq 0$.",
    options: ["$a$", "$a^{2}$", "$a^{11}$", "$\\dfrac{1}{a}$", "$a^{5}$"], correct: 0,
    explanation: "$\\dfrac{a^{6}\\cdot a^{-2}}{a^{3}}=a^{6-2-3}=a^{1}=a$." },

  { id: "expr-02", section: "expr", level: "II", type: "B",
    question: "Найдите значение выражения $\\dfrac{x^{2}-9}{x-3}$ при $x=5$.",
    answer: "8",
    explanation: "Разложим числитель: $x^{2}-9=(x-3)(x+3)$. Дробь равна $x+3$. При $x=5$ получаем $5+3=8$." },

  { id: "expr-03", section: "expr", level: "II", type: "A",
    question: "Разложите на множители: $x^{2}-5x+6$.",
    options: ["$(x-2)(x-3)$", "$(x+2)(x+3)$", "$(x-1)(x-6)$", "$(x-2)(x+3)$", "$(x+1)(x-6)$"], correct: 0,
    explanation: "По теореме Виета сумма корней равна $5$, произведение — $6$. Корни $2$ и $3$, поэтому $x^{2}-5x+6=(x-2)(x-3)$." },

  { id: "expr-04", section: "expr", level: "II", type: "B",
    question: "Найдите значение выражения $(a+b)^{2}-(a-b)^{2}$ при $a=3$, $b=-2$.",
    answer: "-24",
    explanation: "Упростим: $(a+b)^{2}-(a-b)^{2}=4ab$. Тогда $4\\cdot 3\\cdot(-2)=-24$." },

  { id: "expr-05", section: "expr", level: "III", type: "A",
    question: "Сократите дробь $\\dfrac{x^{2}-4}{x^{2}-4x+4}$.",
    options: ["$\\dfrac{x+2}{x-2}$", "$\\dfrac{x-2}{x+2}$", "$x+2$", "$\\dfrac{1}{x-2}$", "$\\dfrac{x+4}{x-2}$"], correct: 0,
    explanation: "$x^{2}-4=(x-2)(x+2)$, а $x^{2}-4x+4=(x-2)^{2}$. После сокращения на $(x-2)$ получаем $\\dfrac{x+2}{x-2}$." },

  { id: "expr-06", section: "expr", level: "III", type: "B",
    question: "Вычислите: $\\dfrac{6^{6}}{2^{5}\\cdot 3^{6}}$.",
    answer: "2",
    explanation: "$6^{6}=(2\\cdot 3)^{6}=2^{6}\\cdot 3^{6}$. Тогда $\\dfrac{2^{6}\\cdot 3^{6}}{2^{5}\\cdot 3^{6}}=2^{6-5}=2$." },

  { id: "expr-07", section: "expr", level: "III", type: "B",
    question: "Найдите значение выражения $\\sqrt{a^{2}-6a+9}$ при $a=2$.",
    answer: "1",
    explanation: "$a^{2}-6a+9=(a-3)^{2}$, поэтому $\\sqrt{(a-3)^{2}}=|a-3|$. При $a=2$: $|2-3|=1$." },

  { id: "expr-08", section: "expr", level: "II", type: "A",
    question: "Упростите выражение $\\dfrac{1}{a}+\\dfrac{1}{b}$.",
    options: ["$\\dfrac{a+b}{ab}$", "$\\dfrac{ab}{a+b}$", "$\\dfrac{1}{a+b}$", "$\\dfrac{a-b}{ab}$", "$\\dfrac{2}{ab}$"], correct: 0,
    explanation: "Приведём к общему знаменателю: $\\dfrac{1}{a}+\\dfrac{1}{b}=\\dfrac{b+a}{ab}=\\dfrac{a+b}{ab}$." },

  { id: "expr-09", section: "expr", level: "III", type: "B",
    question: "Найдите значение выражения $\\dfrac{\\sqrt{12}\\cdot\\sqrt{3}}{2}$.",
    answer: "3",
    explanation: "$\\sqrt{12}\\cdot\\sqrt{3}=\\sqrt{36}=6$, тогда $\\dfrac{6}{2}=3$." },

  { id: "expr-10", section: "expr", level: "IV", type: "B",
    question: "Известно, что $a-b=4$ и $ab=-2$. Найдите $a^{3}-b^{3}$.",
    answer: "40",
    explanation: "$a^{3}-b^{3}=(a-b)(a^{2}+ab+b^{2})$. При этом $a^{2}+b^{2}=(a-b)^{2}+2ab=16-4=12$. Тогда $a^{2}+ab+b^{2}=12-2=10$, и $a^{3}-b^{3}=4\\cdot 10=40$." },

  { id: "expr-11", section: "expr", level: "III", type: "A",
    question: "Найдите значение выражения $\\dfrac{2^{\\log_{2}5}\\cdot 3^{\\log_{3}4}}{10}$.",
    options: ["$2$", "$5$", "$4$", "$10$", "$20$"], correct: 0,
    explanation: "По основному логарифмическому тождеству $2^{\\log_{2}5}=5$ и $3^{\\log_{3}4}=4$. Тогда $\\dfrac{5\\cdot 4}{10}=2$." },

  { id: "expr-12", section: "expr", level: "IV", type: "B",
    question: "Упростите выражение $\\dfrac{(x+y)^{2}-(x-y)^{2}}{xy}$ при $x\\neq 0$, $y\\neq 0$ и найдите его значение.",
    answer: "4",
    explanation: "$(x+y)^{2}-(x-y)^{2}=4xy$. Тогда $\\dfrac{4xy}{xy}=4$ для любых допустимых $x$ и $y$." },

  { id: "expr-13", section: "expr", level: "III", type: "B",
    question: "Найдите значение выражения $\\dfrac{5^{2}\\cdot 5^{-4}}{5^{-3}}$.",
    answer: "5",
    explanation: "$\\dfrac{5^{2}\\cdot 5^{-4}}{5^{-3}}=5^{2-4+3}=5^{1}=5$." },

  { id: "expr-14", section: "expr", level: "II", type: "A",
    question: "Упростите: $\\sqrt{8}+\\sqrt{18}$.",
    options: ["$5\\sqrt{2}$", "$\\sqrt{26}$", "$6\\sqrt{2}$", "$13\\sqrt{2}$", "$5$"], correct: 0,
    explanation: "$\\sqrt{8}=2\\sqrt{2}$, $\\sqrt{18}=3\\sqrt{2}$, тогда $2\\sqrt{2}+3\\sqrt{2}=5\\sqrt{2}$." },

  { id: "expr-15", section: "expr", level: "IV", type: "B",
    question: "Известно, что $x+\\dfrac{1}{x}=5$. Найдите $x^{2}+\\dfrac{1}{x^{2}}$.",
    answer: "23",
    explanation: "Возведём в квадрат: $\\left(x+\\dfrac{1}{x}\\right)^{2}=x^{2}+2+\\dfrac{1}{x^{2}}=25$. Тогда $x^{2}+\\dfrac{1}{x^{2}}=25-2=23$." },

  { id: "expr-16", section: "expr", level: "IV", type: "B",
    question: "Найдите значение выражения $\\dfrac{a^{2}-b^{2}}{a+b}$ при $a=7$, $b=3$.",
    answer: "4",
    explanation: "$\\dfrac{a^{2}-b^{2}}{a+b}=\\dfrac{(a-b)(a+b)}{a+b}=a-b=7-3=4$." },

  { id: "expr-17", section: "expr", level: "V", type: "B",
    question: "Известно, что $a+b=3$ и $ab=-1$. Найдите $a^{3}+b^{3}$.",
    answer: "36",
    explanation: "$a^{3}+b^{3}=(a+b)^{3}-3ab(a+b)=3^{3}-3\\cdot(-1)\\cdot 3=27+9=36$." },

  /* ==================== УРАВНЕНИЯ И НЕРАВЕНСТВА ==================== */
  { id: "eq-01", section: "eq", level: "I", type: "B",
    question: "Решите уравнение $2x-6=0$. В ответ запишите корень.",
    answer: "3",
    explanation: "$2x=6$, откуда $x=3$." },

  { id: "eq-02", section: "eq", level: "II", type: "B",
    question: "Решите уравнение $x^{2}-5x+6=0$. В ответ запишите больший корень.",
    answer: "3",
    explanation: "По теореме Виета корни равны $2$ и $3$. Больший корень — $3$." },

  { id: "eq-03", section: "eq", level: "II", type: "B",
    question: "Решите уравнение $\\sqrt{x+2}=3$.",
    answer: "7",
    explanation: "Возведём в квадрат: $x+2=9$, откуда $x=7$. Проверка: $\\sqrt{9}=3$ — верно." },

  { id: "eq-04", section: "eq", level: "II", type: "B",
    question: "Найдите сумму корней уравнения $x^{2}-7x+10=0$.",
    answer: "7",
    explanation: "По теореме Виета сумма корней приведённого квадратного уравнения равна $-\\dfrac{b}{a}=7$." },

  { id: "eq-05", section: "eq", level: "II", type: "A",
    question: "Решите неравенство $2x+5>1$.",
    options: ["$x>-2$", "$x<2$", "$x>-3$", "$x<3$", "$x>2$"], correct: 0,
    explanation: "$2x>1-5$, то есть $2x>-4$, откуда $x>-2$." },

  { id: "eq-06", section: "eq", level: "III", type: "B",
    question: "Решите уравнение $3^{x-2}=27$.",
    answer: "5",
    explanation: "$27=3^{3}$, значит $x-2=3$, откуда $x=5$." },

  { id: "eq-07", section: "eq", level: "III", type: "B",
    question: "Решите уравнение $\\log_{2}(x-1)=3$.",
    answer: "9",
    explanation: "$x-1=2^{3}=8$, откуда $x=9$. Проверка: $x-1=8>0$ — верно." },

  { id: "eq-08", section: "eq", level: "IV", type: "B",
    question: "Решите уравнение $x^{3}-4x=0$. В ответ запишите наибольший корень.",
    answer: "2",
    explanation: "$x(x^{2}-4)=x(x-2)(x+2)=0$. Корни: $-2$, $0$, $2$. Наибольший — $2$." },

  { id: "eq-09", section: "eq", level: "IV", type: "B",
    question: "Решите уравнение $\\dfrac{x+3}{x-1}=2$.",
    answer: "5",
    explanation: "При $x\\neq 1$: $x+3=2(x-1)=2x-2$. Тогда $5=x$, то есть $x=5$." },

  { id: "eq-10", section: "eq", level: "III", type: "A",
    question: "Сколько целых решений имеет неравенство $x^{2}-4\\le 0$?",
    options: ["$5$", "$4$", "$3$", "$7$", "$2$"], correct: 0,
    explanation: "$x^{2}\\le 4$ означает $-2\\le x\\le 2$. Целые решения: $-2,-1,0,1,2$ — всего $5$." },

  { id: "eq-11", section: "eq", level: "IV", type: "B",
    question: "Решите уравнение $\\sqrt{2x+3}=x$.",
    answer: "3",
    explanation: "Возведём в квадрат: $2x+3=x^{2}$, то есть $x^{2}-2x-3=0$. Корни $3$ и $-1$. Проверка: при $x=-1$ правая часть отрицательна — не подходит. Ответ: $3$." },

  { id: "eq-12", section: "eq", level: "III", type: "B",
    question: "Найдите наибольшее целое решение неравенства $\\dfrac{x-1}{2}\\ge x-3$.",
    answer: "5",
    explanation: "Умножим на $2$: $x-1\\ge 2x-6$, откуда $-x\\ge -5$ и $x\\le 5$. Наибольшее целое решение — $5$." },

  { id: "eq-13", section: "eq", level: "IV", type: "A",
    question: "Решите неравенство $x^{2}-3x-4>0$.",
    options: ["$x<-1$ или $x>4$", "$-1<x<4$", "$x<-4$ или $x>1$", "$x>4$", "$x<-1$"], correct: 0,
    explanation: "Корни уравнения $x^{2}-3x-4=0$ равны $-1$ и $4$. Ветви параболы вверх, поэтому $x^{2}-3x-4>0$ при $x<-1$ или $x>4$." },

  { id: "eq-14", section: "eq", level: "III", type: "B",
    question: "Решите уравнение $\\log_{2}x=4$.",
    answer: "16",
    explanation: "$x=2^{4}=16$." },

  { id: "eq-15", section: "eq", level: "V", type: "B",
    question: "Решите уравнение $9^{x}-4\\cdot 3^{x}+3=0$. В ответ запишите сумму корней.",
    answer: "1",
    explanation: "Пусть $t=3^{x}>0$. Тогда $t^{2}-4t+3=0$, откуда $t=1$ или $t=3$. Значит $3^{x}=1$ (то есть $x=0$) или $3^{x}=3$ (то есть $x=1$). Сумма корней $0+1=1$." },

  { id: "eq-16", section: "eq", level: "IV", type: "B",
    question: "Решите уравнение $\\sqrt{x+6}=x$.",
    answer: "3",
    explanation: "Возведём в квадрат: $x+6=x^{2}$, то есть $x^{2}-x-6=0$. Корни $3$ и $-2$. Проверка: $x=-2$ не подходит (правая часть отрицательна). Ответ: $3$." },

  { id: "eq-17", section: "eq", level: "II", type: "B",
    question: "Решите уравнение $5-2x=9$.",
    answer: "-2",
    explanation: "$-2x=4$, откуда $x=-2$." },

  { id: "eq-18", section: "eq", level: "IV", type: "B",
    question: "Решите уравнение $x^{2}-6x+8=0$. В ответ запишите произведение корней.",
    answer: "8",
    explanation: "По теореме Виета произведение корней приведённого уравнения равно свободному члену: $8$. (Корни $2$ и $4$.)" },

  { id: "eq-19", section: "eq", level: "IV", type: "B",
    question: "Решите неравенство $2^{x}>8$. В ответ запишите наименьшее целое решение.",
    answer: "4",
    explanation: "$8=2^{3}$, поэтому $x>3$. Наименьшее целое решение — $4$." },

  { id: "eq-20", section: "eq", level: "V", type: "B",
    question: "Найдите сумму корней уравнения $x^{4}-5x^{2}+4=0$.",
    answer: "0",
    explanation: "Пусть $t=x^{2}\\ge 0$. Тогда $t^{2}-5t+4=0$, откуда $t=1$ или $t=4$. Корни: $x=\\pm 1$, $x=\\pm 2$. Их сумма равна $0$." },

  /* ==================== КООРДИНАТЫ И ФУНКЦИИ ==================== */
  { id: "func-01", section: "func", level: "I", type: "B",
    question: "Функция задана формулой $y=3x-2$. Найдите значение функции при $x=4$.",
    answer: "10",
    explanation: "$y=3\\cdot 4-2=10$." },

  { id: "func-02", section: "func", level: "II", type: "A",
    question: "Прямая задана уравнением $y=-2x+1$. Найдите абсциссу точки пересечения прямой с осью $Ox$.",
    options: ["$0{,}5$", "$1$", "$-0{,}5$", "$2$", "$-2$"], correct: 0,
    explanation: "На оси $Ox$ имеем $y=0$: $-2x+1=0$, откуда $x=0{,}5$." },

  { id: "func-03", section: "func", level: "II", type: "B",
    question: "Прямая $y=kx+3$ проходит через точку $(2;7)$. Найдите $k$.",
    answer: "2",
    explanation: "Подставим координаты: $7=2k+3$, откуда $2k=4$ и $k=2$." },

  { id: "func-04", section: "func", level: "III", type: "B",
    question: "Найдите наименьшее значение функции $y=x^{2}-6x+5$.",
    answer: "-4",
    explanation: "Вершина параболы: $x_0=\\dfrac{6}{2}=3$. Тогда $y_{\\min}=3^{2}-6\\cdot 3+5=9-18+5=-4$." },

  { id: "func-05", section: "func", level: "II", type: "A",
    question: "Какая из данных функций является линейной?",
    options: ["$y=3x-1$", "$y=x^{2}+1$", "$y=\\dfrac{1}{x}$", "$y=\\sqrt{x}$", "$y=2^{x}$"], correct: 0,
    explanation: "Линейная функция имеет вид $y=kx+b$. Это $y=3x-1$." },

  { id: "func-06", section: "func", level: "III", type: "B",
    question: "Найдите сумму координат вершины параболы $y=2x^{2}-8x+1$.",
    answer: "-5",
    explanation: "$x_0=\\dfrac{8}{2\\cdot 2}=2$. Тогда $y_0=2\\cdot 4-8\\cdot 2+1=-7$. Сумма координат $2+(-7)=-5$." },

  { id: "func-07", section: "func", level: "III", type: "B",
    question: "Найдите $f(2)$, если $f(x)=x^{3}-2x$.",
    answer: "4",
    explanation: "$f(2)=2^{3}-2\\cdot 2=8-4=4$." },

  { id: "func-08", section: "func", level: "IV", type: "B",
    question: "Найдите абсциссу точки пересечения графиков функций $y=2x-1$ и $y=-x+8$.",
    answer: "3",
    explanation: "Приравняем: $2x-1=-x+8$, то есть $3x=9$, откуда $x=3$." },

  { id: "func-09", section: "func", level: "III", type: "B",
    question: "Найдите наибольший нуль функции $y=x^{2}-9$.",
    answer: "3",
    explanation: "$x^{2}-9=0$ при $x=\\pm 3$. Наибольший нуль — $3$." },

  { id: "func-10", section: "func", level: "IV", type: "B",
    question: "Найдите наибольшее значение функции $y=-x^{2}+4x+1$.",
    answer: "5",
    explanation: "Ветви вниз, вершина при $x_0=\\dfrac{4}{2}=2$. Тогда $y_{\\max}=-4+8+1=5$." },

  { id: "func-11", section: "func", level: "IV", type: "B",
    question: "Прямая $y=kx+b$ проходит через точки $(1;4)$ и $(3;2)$. Найдите $k+b$.",
    answer: "4",
    explanation: "Вычтем уравнения: $4-2=k(1-3)$, то есть $2=-2k$ и $k=-1$. Тогда из $4=k+b$ получаем $b=5$. Значит $k+b=4$." },

  { id: "func-12", section: "func", level: "III", type: "A",
    question: "Найдите область определения функции $y=\\dfrac{1}{x-3}$.",
    options: ["$x\\neq 3$", "$x\\neq 0$", "$x>3$", "$x\\ge 3$", "$x\\neq -3$"], correct: 0,
    explanation: "Знаменатель не должен обращаться в нуль: $x-3\\neq 0$, поэтому $x\\neq 3$." },

  { id: "func-13", section: "func", level: "IV", type: "B",
    question: "При каком значении $x$ функция $y=x^{2}-4x$ принимает наименьшее значение? В ответ запишите это значение $x$.",
    answer: "2",
    explanation: "Вершина параболы: $x_0=\\dfrac{4}{2}=2$." },

  { id: "func-14", section: "func", level: "V", type: "B",
    question: "Найдите $f(f(1))$, если $f(x)=2x+1$.",
    answer: "7",
    explanation: "$f(1)=2\\cdot 1+1=3$, тогда $f(f(1))=f(3)=2\\cdot 3+1=7$." },

  { id: "func-15", section: "func", level: "III", type: "B",
    question: "График функции $y=kx-4$ проходит через точку $(3;5)$. Найдите $k$.",
    answer: "3",
    explanation: "$5=3k-4$, откуда $3k=9$ и $k=3$." },

  { id: "func-16", section: "func", level: "IV", type: "B",
    question: "Найдите значение $a$, при котором график функции $y=x^{2}+a$ проходит через точку $(2;7)$.",
    answer: "3",
    explanation: "$7=2^{2}+a=4+a$, откуда $a=3$." },

  { id: "func-17", section: "func", level: "II", type: "B",
    question: "Найдите значение функции $y=-x+5$ при $x=-2$.",
    answer: "7",
    explanation: "$y=-(-2)+5=2+5=7$." },

  { id: "func-18", section: "func", level: "V", type: "B",
    question: "Найдите сумму нулей функции $y=x^{2}-5x+6$.",
    answer: "5",
    explanation: "Нули — корни уравнения $x^{2}-5x+6=0$: $2$ и $3$. Их сумма $2+3=5$ (по теореме Виета равна $5$)." },

  /* ==================== ГЕОМЕТРИЯ ==================== */
  { id: "geo-01", section: "geo", level: "I", type: "B",
    question: "Найдите площадь прямоугольника со сторонами 6 и 4.",
    answer: "24",
    explanation: "$S=ab=6\\cdot 4=24$." },

  { id: "geo-02", section: "geo", level: "II", type: "B",
    question: "Катеты прямоугольного треугольника равны 6 и 8. Найдите гипотенузу.",
    answer: "10",
    explanation: "По теореме Пифагора $c=\\sqrt{6^{2}+8^{2}}=\\sqrt{100}=10$." },

  { id: "geo-03", section: "geo", level: "II", type: "B",
    question: "Найдите площадь треугольника, если его основание равно 10, а высота, проведённая к этому основанию, равна 6.",
    answer: "30",
    explanation: "$S=\\dfrac{1}{2}\\cdot 10\\cdot 6=30$." },

  { id: "geo-04", section: "geo", level: "II", type: "B",
    question: "Найдите радиус круга, площадь которого равна $16\\pi$.",
    answer: "4",
    explanation: "$S=\\pi r^{2}=16\\pi$, значит $r^{2}=16$ и $r=4$." },

  { id: "geo-05", section: "geo", level: "III", type: "B",
    question: "В прямоугольном треугольнике гипотенуза равна 13, один из катетов равен 5. Найдите второй катет.",
    answer: "12",
    explanation: "По теореме Пифагора $b=\\sqrt{13^{2}-5^{2}}=\\sqrt{169-25}=\\sqrt{144}=12$." },

  { id: "geo-06", section: "geo", level: "II", type: "B",
    question: "Диагонали ромба равны 6 и 8. Найдите площадь ромба.",
    answer: "24",
    explanation: "$S=\\dfrac{1}{2}d_1 d_2=\\dfrac{1}{2}\\cdot 6\\cdot 8=24$." },

  { id: "geo-07", section: "geo", level: "III", type: "B",
    question: "Основания трапеции равны 4 и 10, высота равна 6. Найдите площадь трапеции.",
    answer: "42",
    explanation: "$S=\\dfrac{a+b}{2}\\cdot h=\\dfrac{4+10}{2}\\cdot 6=7\\cdot 6=42$." },

  { id: "geo-08", section: "geo", level: "III", type: "A",
    question: "Площадь круга равна $36\\pi$. Найдите длину ограничивающей его окружности.",
    options: ["$12\\pi$", "$6\\pi$", "$36\\pi$", "$18\\pi$", "$24\\pi$"], correct: 0,
    explanation: "$\\pi r^{2}=36\\pi$, значит $r=6$. Длина окружности $C=2\\pi r=2\\pi\\cdot 6=12\\pi$." },

  { id: "geo-09", section: "geo", level: "III", type: "B",
    question: "Катеты прямоугольного треугольника равны 3 и 4. Найдите радиус вписанной в него окружности.",
    answer: "1",
    explanation: "Гипотенуза $c=5$. Радиус вписанной окружности $r=\\dfrac{a+b-c}{2}=\\dfrac{3+4-5}{2}=1$." },

  { id: "geo-10", section: "geo", level: "IV", type: "B",
    question: "В треугольнике со сторонами 5, 12 и 13 найдите радиус вписанной окружности.",
    answer: "2",
    explanation: "Треугольник прямоугольный ($5^{2}+12^{2}=13^{2}$). Тогда $r=\\dfrac{5+12-13}{2}=2$." },

  { id: "geo-11", section: "geo", level: "III", type: "B",
    question: "Найдите площадь прямоугольного треугольника с катетами 3 и 4.",
    answer: "6",
    explanation: "$S=\\dfrac{1}{2}\\cdot 3\\cdot 4=6$." },

  { id: "geo-12", section: "geo", level: "III", type: "B",
    question: "Угол при вершине равнобедренного треугольника равен $60^{\\circ}$, боковая сторона равна 8. Найдите основание.",
    answer: "8",
    explanation: "Углы при основании равны $\\dfrac{180^{\\circ}-60^{\\circ}}{2}=60^{\\circ}$, значит треугольник равносторонний. Основание также равно $8$." },

  { id: "geo-13", section: "geo", level: "IV", type: "B",
    question: "Вписанный угол опирается на дугу, градусная мера которой равна $100^{\\circ}$. Найдите величину вписанного угла.",
    answer: "50",
    explanation: "Вписанный угол равен половине дуги, на которую он опирается: $100^{\\circ}:2=50^{\\circ}$." },

  { id: "geo-14", section: "geo", level: "IV", type: "B",
    question: "Основания равнобедренной трапеции равны 6 и 12, боковая сторона равна 5. Найдите площадь трапеции.",
    answer: "36",
    explanation: "Разность оснований $6$, полуразность $3$. Высота $h=\\sqrt{5^{2}-3^{2}}=4$. Тогда $S=\\dfrac{6+12}{2}\\cdot 4=9\\cdot 4=36$." },

  { id: "geo-15", section: "geo", level: "IV", type: "B",
    question: "Найдите объём куба с ребром 3.",
    answer: "27",
    explanation: "$V=a^{3}=3^{3}=27$." },

  { id: "geo-16", section: "geo", level: "IV", type: "B",
    question: "Найдите объём прямоугольного параллелепипеда с измерениями 2, 3 и 4.",
    answer: "24",
    explanation: "$V=abc=2\\cdot 3\\cdot 4=24$." },

  { id: "geo-17", section: "geo", level: "V", type: "B",
    question: "Площадь полной поверхности куба равна 96. Найдите ребро куба.",
    answer: "4",
    explanation: "$S=6a^{2}=96$, значит $a^{2}=16$ и $a=4$." },

  { id: "geo-18", section: "geo", level: "IV", type: "B",
    question: "В куб с ребром 2 вписан шар. Найдите радиус шара.",
    answer: "1",
    explanation: "Диаметр вписанного шара равен ребру куба: $d=2$, поэтому $r=1$." },

  { id: "geo-19", section: "geo", level: "IV", type: "A",
    question: "Треугольник со сторонами 6, 8 и 10 является:",
    options: ["прямоугольным", "равносторонним", "тупоугольным", "равнобедренным", "остроугольным, но не прямоугольным"], correct: 0,
    explanation: "Проверим теорему Пифагора: $6^{2}+8^{2}=36+64=100=10^{2}$. Значит, треугольник прямоугольный." },

  { id: "geo-20", section: "geo", level: "V", type: "B",
    question: "Найдите диагональ прямоугольного параллелепипеда с измерениями 2, 3 и 6.",
    answer: "7",
    explanation: "$d=\\sqrt{a^{2}+b^{2}+c^{2}}=\\sqrt{4+9+36}=\\sqrt{49}=7$." },

  { id: "geo-21", section: "geo", level: "III", type: "B",
    question: "Периметр квадрата равен 20. Найдите его площадь.",
    answer: "25",
    explanation: "Сторона квадрата $a=20:4=5$, площадь $S=a^{2}=25$." },

  { id: "geo-22", section: "geo", level: "IV", type: "B",
    question: "Найдите сумму углов выпуклого шестиугольника (в градусах).",
    answer: "720",
    explanation: "Сумма углов выпуклого $n$-угольника: $(n-2)\\cdot 180^{\\circ}=(6-2)\\cdot 180^{\\circ}=720^{\\circ}$." },

  { id: "geo-23", section: "geo", level: "V", type: "B",
    question: "Площадь полной поверхности куба равна 54. Найдите его объём.",
    answer: "27",
    explanation: "$6a^{2}=54$, значит $a^{2}=9$ и $a=3$. Тогда $V=a^{3}=27$." },

  { id: "geo-24", section: "geo", level: "III", type: "A",
    question: "Один из смежных углов равен $50^{\\circ}$. Найдите второй угол.",
    options: ["$130^{\\circ}$", "$50^{\\circ}$", "$40^{\\circ}$", "$90^{\\circ}$", "$150^{\\circ}$"], correct: 0,
    explanation: "Сумма смежных углов равна $180^{\\circ}$, поэтому второй угол равен $180^{\\circ}-50^{\\circ}=130^{\\circ}$." },

  { id: "geo-25", section: "geo", level: "IV", type: "A",
    question: "Радиус окружности равен 6. Найдите площадь круга.",
    options: ["$36\\pi$", "$12\\pi$", "$6\\pi$", "$18\\pi$", "$72\\pi$"], correct: 0,
    explanation: "$S=\\pi r^{2}=\\pi\\cdot 6^{2}=36\\pi$." }

];
