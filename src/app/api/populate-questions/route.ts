import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createQuestion } from '@/utils/database';

const DUMMY_MATH_QUESTIONS = [
  // Simple number questions
  {
    skill_id: 'linear-equations-one-var',
    difficulty_level: 1,
    question_text: '<p>What is this number? 5</p>',
    answer_options: [
      { id: 'A', content: '<p>3</p>', is_correct: false },
      { id: 'B', content: '<p>5</p>', is_correct: true },
      { id: 'C', content: '<p>7</p>', is_correct: false },
      { id: 'D', content: '<p>9</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>The number is 5.</p>'
  },
  {
    skill_id: 'linear-equations-one-var',
    difficulty_level: 1,
    question_text: '<p>What is 2 + 3?</p>',
    answer_options: [
      { id: 'A', content: '<p>4</p>', is_correct: false },
      { id: 'B', content: '<p>5</p>', is_correct: true },
      { id: 'C', content: '<p>6</p>', is_correct: false },
      { id: 'D', content: '<p>7</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>2 + 3 = 5.</p>'
  },
  {
    skill_id: 'linear-equations-one-var',
    difficulty_level: 2,
    question_text: '<p>What is 4 × 3?</p>',
    answer_options: [
      { id: 'A', content: '<p>10</p>', is_correct: false },
      { id: 'B', content: '<p>11</p>', is_correct: false },
      { id: 'C', content: '<p>12</p>', is_correct: true },
      { id: 'D', content: '<p>13</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>4 × 3 = 12.</p>'
  },
  {
    skill_id: 'linear-equations-one-var',
    difficulty_level: 2,
    question_text: '<p>What is 15 ÷ 3?</p>',
    answer_options: [
      { id: 'A', content: '<p>4</p>', is_correct: false },
      { id: 'B', content: '<p>5</p>', is_correct: true },
      { id: 'C', content: '<p>6</p>', is_correct: false },
      { id: 'D', content: '<p>7</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>15 ÷ 3 = 5.</p>'
  },
  {
    skill_id: 'systems-linear-equations',
    difficulty_level: 1,
    question_text: '<p>What is 10 - 4?</p>',
    answer_options: [
      { id: 'A', content: '<p>5</p>', is_correct: false },
      { id: 'B', content: '<p>6</p>', is_correct: true },
      { id: 'C', content: '<p>7</p>', is_correct: false },
      { id: 'D', content: '<p>8</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>10 - 4 = 6.</p>'
  },
  {
    skill_id: 'systems-linear-equations',
    difficulty_level: 2,
    question_text: '<p>What is 7 + 8?</p>',
    answer_options: [
      { id: 'A', content: '<p>14</p>', is_correct: false },
      { id: 'B', content: '<p>15</p>', is_correct: true },
      { id: 'C', content: '<p>16</p>', is_correct: false },
      { id: 'D', content: '<p>17</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>7 + 8 = 15.</p>'
  },
  {
    skill_id: 'ratios-rates-proportions',
    difficulty_level: 1,
    question_text: '<p>What is 6 × 2?</p>',
    answer_options: [
      { id: 'A', content: '<p>10</p>', is_correct: false },
      { id: 'B', content: '<p>11</p>', is_correct: false },
      { id: 'C', content: '<p>12</p>', is_correct: true },
      { id: 'D', content: '<p>13</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>6 × 2 = 12.</p>'
  },
  {
    skill_id: 'ratios-rates-proportions',
    difficulty_level: 2,
    question_text: '<p>What is 20 ÷ 4?</p>',
    answer_options: [
      { id: 'A', content: '<p>4</p>', is_correct: false },
      { id: 'B', content: '<p>5</p>', is_correct: true },
      { id: 'C', content: '<p>6</p>', is_correct: false },
      { id: 'D', content: '<p>7</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>20 ÷ 4 = 5.</p>'
  },
  {
    skill_id: 'percentages',
    difficulty_level: 1,
    question_text: '<p>What is 9 + 1?</p>',
    answer_options: [
      { id: 'A', content: '<p>8</p>', is_correct: false },
      { id: 'B', content: '<p>9</p>', is_correct: false },
      { id: 'C', content: '<p>10</p>', is_correct: true },
      { id: 'D', content: '<p>11</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>9 + 1 = 10.</p>'
  },
  {
    skill_id: 'percentages',
    difficulty_level: 2,
    question_text: '<p>What is 5 × 4?</p>',
    answer_options: [
      { id: 'A', content: '<p>18</p>', is_correct: false },
      { id: 'B', content: '<p>19</p>', is_correct: false },
      { id: 'C', content: '<p>20</p>', is_correct: true },
      { id: 'D', content: '<p>21</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>5 × 4 = 20.</p>'
  },
  {
    skill_id: 'area-volume',
    difficulty_level: 1,
    question_text: '<p>What is 12 - 7?</p>',
    answer_options: [
      { id: 'A', content: '<p>4</p>', is_correct: false },
      { id: 'B', content: '<p>5</p>', is_correct: true },
      { id: 'C', content: '<p>6</p>', is_correct: false },
      { id: 'D', content: '<p>7</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>12 - 7 = 5.</p>'
  },
  {
    skill_id: 'area-volume',
    difficulty_level: 2,
    question_text: '<p>What is 8 + 6?</p>',
    answer_options: [
      { id: 'A', content: '<p>13</p>', is_correct: false },
      { id: 'B', content: '<p>14</p>', is_correct: true },
      { id: 'C', content: '<p>15</p>', is_correct: false },
      { id: 'D', content: '<p>16</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>8 + 6 = 14.</p>'
  },
  {
    skill_id: 'nonlinear-functions',
    difficulty_level: 1,
    question_text: '<p>What is 3 × 5?</p>',
    answer_options: [
      { id: 'A', content: '<p>14</p>', is_correct: false },
      { id: 'B', content: '<p>15</p>', is_correct: true },
      { id: 'C', content: '<p>16</p>', is_correct: false },
      { id: 'D', content: '<p>17</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>3 × 5 = 15.</p>'
  },
  {
    skill_id: 'nonlinear-functions',
    difficulty_level: 2,
    question_text: '<p>What is 24 ÷ 6?</p>',
    answer_options: [
      { id: 'A', content: '<p>3</p>', is_correct: false },
      { id: 'B', content: '<p>4</p>', is_correct: true },
      { id: 'C', content: '<p>5</p>', is_correct: false },
      { id: 'D', content: '<p>6</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>24 ÷ 6 = 4.</p>'
  },
  {
    skill_id: 'right-triangles-trigonometry',
    difficulty_level: 1,
    question_text: '<p>What is 11 - 3?</p>',
    answer_options: [
      { id: 'A', content: '<p>7</p>', is_correct: false },
      { id: 'B', content: '<p>8</p>', is_correct: true },
      { id: 'C', content: '<p>9</p>', is_correct: false },
      { id: 'D', content: '<p>10</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>11 - 3 = 8.</p>'
  },
  {
    skill_id: 'right-triangles-trigonometry',
    difficulty_level: 2,
    question_text: '<p>What is 9 × 2?</p>',
    answer_options: [
      { id: 'A', content: '<p>16</p>', is_correct: false },
      { id: 'B', content: '<p>17</p>', is_correct: false },
      { id: 'C', content: '<p>18</p>', is_correct: true },
      { id: 'D', content: '<p>19</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>9 × 2 = 18.</p>'
  },
  {
    skill_id: 'linear-functions',
    difficulty_level: 1,
    question_text: '<p>What is 16 ÷ 2?</p>',
    answer_options: [
      { id: 'A', content: '<p>6</p>', is_correct: false },
      { id: 'B', content: '<p>7</p>', is_correct: false },
      { id: 'C', content: '<p>8</p>', is_correct: true },
      { id: 'D', content: '<p>9</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>16 ÷ 2 = 8.</p>'
  },
  {
    skill_id: 'linear-functions',
    difficulty_level: 2,
    question_text: '<p>What is 13 + 7?</p>',
    answer_options: [
      { id: 'A', content: '<p>19</p>', is_correct: false },
      { id: 'B', content: '<p>20</p>', is_correct: true },
      { id: 'C', content: '<p>21</p>', is_correct: false },
      { id: 'D', content: '<p>22</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>13 + 7 = 20.</p>'
  },
  {
    skill_id: 'linear-inequalities',
    difficulty_level: 1,
    question_text: '<p>What is 4 × 7?</p>',
    answer_options: [
      { id: 'A', content: '<p>26</p>', is_correct: false },
      { id: 'B', content: '<p>27</p>', is_correct: false },
      { id: 'C', content: '<p>28</p>', is_correct: true },
      { id: 'D', content: '<p>29</p>', is_correct: false }
    ],
    correct_answers: ['C'],
    explanation: '<p>4 × 7 = 28.</p>'
  },
  {
    skill_id: 'equivalent-expressions',
    difficulty_level: 1,
    question_text: '<p>What is 18 - 9?</p>',
    answer_options: [
      { id: 'A', content: '<p>8</p>', is_correct: false },
      { id: 'B', content: '<p>9</p>', is_correct: true },
      { id: 'C', content: '<p>10</p>', is_correct: false },
      { id: 'D', content: '<p>11</p>', is_correct: false }
    ],
    correct_answers: ['B'],
    explanation: '<p>18 - 9 = 9.</p>'
  }
];

export async function POST() {
  try {
    const supabase = await createClient();
    // Authentication is now handled by middleware
    
    // Check if questions already exist
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('id')
      .eq('origin_id', 'custom')
      .limit(1);
    
    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json({ 
        message: 'Questions already exist', 
        count: existingQuestions.length 
      });
    }
    
    // Create all questions
    const results = [];
    for (const questionData of DUMMY_MATH_QUESTIONS) {
      const result = await createQuestion({
        origin_id: 'custom',
        question_text: questionData.question_text,
        question_type: 'mcq',
        skill_id: questionData.skill_id,
        difficulty_level: questionData.difficulty_level,
        answer_options: questionData.answer_options,
        correct_answers: questionData.correct_answers,
        explanation: questionData.explanation,
        est_time_seconds: 90,
        is_active: true
      });
      
      if (result) {
        results.push(result.id);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      created: results.length,
      questionIds: results
    });
    
  } catch (error) {
    console.error('Error populating questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}