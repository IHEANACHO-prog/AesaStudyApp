// ============================================
// Topics List Page — Debugged
// ============================================

import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { topicApi, courseApi } from '@/api/client';
import type { Topic, Course } from '@/types';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

import {
  BookOpen, ChevronRight, ArrowLeft, CheckCircle2, GraduationCap,
} from 'lucide-react';
import { toast } from 'sonner';

const TopicsPage: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const id = parseInt(courseId, 10);
        // FIX: courseApi.getById now takes a single arg — no levelId/deptId needed
        const [topicsData, courseData] = await Promise.all([
          topicApi.getByCourse(id),
          courseApi.getById(id),
        ]);
        setTopics(topicsData.sort((a, b) => a.order - b.order));
        setCourse(courseData);
      } catch (error) {
        console.error('Failed to load topics:', error);
        toast.error('Failed to load topics');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [courseId]);

  const handleComplete = async (e: React.MouseEvent, topicId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!courseId || completedIds.has(topicId)) return;
    try {
      await topicApi.complete(parseInt(courseId, 10), topicId);
      setCompletedIds((prev) => new Set([...prev, topicId]));
      toast.success('Topic marked as complete!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to mark topic as complete');
    }
  };

  const completedCount = completedIds.size;
  const totalCount = topics.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {course ? `${course.code} — Topics` : 'Course Topics'}
            </h1>
            {course && <p className="text-slate-500 mt-1">{course.title}</p>}
          </div>
        </div>
        {course && (
          <Badge
            variant="outline"
            className={
              course.semester === 'FIRST'
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-green-100 text-green-700 border-green-200'
            }
          >
            {course.semester === 'FIRST' ? '1st' : '2nd'} Semester
          </Badge>
        )}
      </div>

      {/* Progress */}
      {!isLoading && totalCount > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Course Progress</span>
              <span className="text-sm text-slate-500">
                {completedCount} of {totalCount} topics completed
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-slate-400 mt-1">{progressPercent}% complete</p>
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : topics.length > 0 ? (
        <>
          <div className="space-y-3">
            {topics.map((topic) => (
              <Link key={topic.id} to={`/courses/${courseId}/topics/${topic.id}`} className="block">
                <TopicCard
                  topic={topic}
                  isCompleted={completedIds.has(topic.id)}
                  onComplete={(e) => handleComplete(e, topic.id)}
                />
              </Link>
            ))}
          </div>

          {/* Self-Assessment CTA */}
          <div className="mt-10 flex flex-col items-center p-8 bg-indigo-50 rounded-2xl border border-indigo-100 border-dashed">
            <GraduationCap className="w-12 h-12 text-indigo-600 mb-4" />
            <h3 className="text-lg font-bold text-indigo-900 mb-2">Ready to test your knowledge?</h3>
            <p className="text-indigo-600/70 text-sm mb-6 text-center max-w-sm">
              Take the comprehensive 100-question assessment covering all topics in this course.
            </p>
            <Link to={`/courses/${courseId}/self-assessment`} className="w-full md:w-auto">
              <Button className={'w-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-xl text-lg font-bold shadow-lg shadow-indigo-200'}>
                Take Self-Assessment (100 Questions)
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No topics yet</h3>
          <p className="text-slate-500 mt-1">Topics for this course have not been added yet.</p>
        </div>
      )}
    </div>
  );
};

// ── Topic Card ──

interface TopicCardProps {
  topic: Topic;
  isCompleted: boolean;
  onComplete: (e: React.MouseEvent) => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ topic, isCompleted, onComplete }) => (
  <Card className={`transition-all hover:shadow-md hover:border-indigo-300 group ${isCompleted ? 'border-green-200 bg-green-50/40' : 'bg-white'}`}>
    <CardContent className="p-4 md:p-6">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
            ${isCompleted
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700'
            }`}>
            {topic.order || '#'}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
              {topic.name}
            </h3>
            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          </div>
          {topic.description && (
            <p className="text-sm text-slate-500 mt-1 line-clamp-1">{topic.description}</p>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-4">
          <Button
            size="sm"
            variant={isCompleted ? 'ghost' : 'outline'}
            disabled={isCompleted}
            onClick={onComplete}
            className={`hidden md:flex text-xs font-bold ${isCompleted ? 'text-green-600' : 'hover:bg-indigo-50 hover:text-indigo-600'}`}
          >
            {isCompleted ? 'Done' : 'Mark Done'}
          </Button>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default TopicsPage;